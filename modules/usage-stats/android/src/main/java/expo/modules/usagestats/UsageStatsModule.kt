package expo.modules.usagestats

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// How far before the requested range we replay events, so we know whether the
// screen was already on/unlocked when the range starts.
private const val LOOKBACK_MS = 6 * 60 * 60 * 1000L

class UsageStatsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    Function("hasPermission") {
      hasUsageAccess()
    }

    Function("openPermissionSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Given N+1 epoch-ms boundaries, returns N values: minutes of unlocked
    // screen time inside each [boundaries[i], boundaries[i+1]) window.
    AsyncFunction("getScreenTimeBuckets") { boundaries: List<Double> ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
        throw IllegalStateException("Screen events require Android 9 (API 28) or newer")
      }
      if (!hasUsageAccess()) {
        throw IllegalStateException("Usage access has not been granted")
      }
      if (boundaries.size < 2) {
        return@AsyncFunction emptyList<Double>()
      }

      val bounds = boundaries.map { it.toLong() }
      val minutes = DoubleArray(bounds.size - 1)
      for ((onAt, offAt) in screenOnIntervals(bounds.first(), bounds.last())) {
        for (i in minutes.indices) {
          val overlap = minOf(offAt, bounds[i + 1]) - maxOf(onAt, bounds[i])
          if (overlap > 0) minutes[i] += overlap / 60_000.0
        }
      }
      minutes.toList()
    }
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    // MODE_DEFAULT means "fall back to the manifest permission check".
    if (mode == AppOpsManager.MODE_DEFAULT) {
      return context.checkSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  // Replays screen/keyguard events and returns [start, end] pairs during which
  // the screen was on AND unlocked.
  private fun screenOnIntervals(from: Long, to: Long): List<LongArray> {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usm.queryEvents(from - LOOKBACK_MS, to)
    val event = UsageEvents.Event()
    val intervals = mutableListOf<LongArray>()

    var interactive = false
    var locked = false
    var onSince: Long? = null

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      when (event.eventType) {
        UsageEvents.Event.SCREEN_INTERACTIVE -> interactive = true
        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> interactive = false
        UsageEvents.Event.KEYGUARD_SHOWN -> locked = true
        UsageEvents.Event.KEYGUARD_HIDDEN -> locked = false
        else -> continue
      }

      val isOn = interactive && !locked
      val since = onSince
      if (isOn && since == null) {
        onSince = event.timeStamp
      } else if (!isOn && since != null) {
        intervals.add(longArrayOf(since, event.timeStamp))
        onSince = null
      }
    }

    // Still on at the end of the range (e.g. right now, while our app is open).
    onSince?.let { intervals.add(longArrayOf(it, minOf(to, System.currentTimeMillis()))) }
    return intervals
  }
}
