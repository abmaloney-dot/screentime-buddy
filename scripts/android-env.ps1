# Points the Android tooling at D:\AndroidDev for the current PowerShell session
# only (C: is too full for the emulator and build caches). Nothing is persisted.
#
#   . .\scripts\android-env.ps1     # note the leading dot: it must be dot-sourced
#   emulator -avd Medium_Phone_API_37.0
#   npm run android

$root = 'D:\AndroidDev'
$env:ANDROID_HOME = "$root\Sdk"
$env:ANDROID_AVD_HOME = "$root\avd"
$env:GRADLE_USER_HOME = "$root\gradle"
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "C:\Program Files\nodejs;$root\Sdk\platform-tools;$root\Sdk\emulator;$env:Path"

Write-Host "Android tooling -> $root (this session only)"
