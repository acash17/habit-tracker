# Cadence — Capacitor + WebView ProGuard rules
# Keep Capacitor plugin bridge classes accessible to JS.
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }

# Keep WebView JavaScript interface methods.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers in stack traces (for crash reports).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
