package io.github.linuxer.systembars

import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.Window
import androidx.core.view.WindowInsetsControllerCompat

object ColorUtils {

    fun parseColor(colorStr: String): Int {
        if (colorStr.equals("transparent", ignoreCase = true)) {
            return Color.TRANSPARENT
        }
        return try {
            Color.parseColor(colorStr)
        } catch (e: IllegalArgumentException) {
            Color.TRANSPARENT
        }
    }

    fun setAppearance(window: Window, style: String, target: String) {
        val decorView = window.decorView
        val controller = WindowInsetsControllerCompat(window, decorView)

        val isLight = style.equals("light", ignoreCase = true) ||
                      style.equals("dark-content", ignoreCase = true)

        if (target == "status" || target == "all") {
            controller.isAppearanceLightStatusBars = isLight
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && (target == "navigation" || target == "all")) {
            controller.isAppearanceLightNavigationBars = isLight
        }
    }

    fun alphaColor(colorStr: String, alpha: Float): Int {
        val base = parseColor(colorStr)
        val a = (alpha.coerceIn(0f, 1f) * 255).toInt()
        return Color.argb(a, Color.red(base), Color.green(base), Color.blue(base))
    }
}
