package io.github.linuxer.systembars

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.Window
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.core.view.WindowCompat
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@TauriPlugin
class SystemBarsPlugin(activity: Activity) : Plugin(activity) {
    private val pluginActivity: Activity = activity

    private var currentStatusBarColor: String = "#00000000"
    private var currentStatusBarStyle: String = "dark"
    private var currentStatusBarHidden: Boolean = false
    private var currentNavBarColor: String = "#00000000"
    private var currentNavBarStyle: String = "dark"
    private var currentNavBarHidden: Boolean = false

    private fun getWindow(): Window? {
        return pluginActivity.window
    }

    private fun runOnUiThread(action: () -> Unit) {
        pluginActivity.runOnUiThread(action)
    }

    @Command
    fun setStatusBar(invoke: Invoke) {
        val args = invoke.getArgs()
        val color = args.optString("color", null)
        val style = args.optString("style", null)

        runOnUiThread {
            val window = getWindow() ?: return@runOnUiThread

            if (color != null) {
                window.statusBarColor = ColorUtils.parseColor(color)
                currentStatusBarColor = color
            }

            if (style != null) {
                currentStatusBarStyle = style
                ColorUtils.setAppearance(window, style, "status")
            }
        }

        invoke.resolve()
    }

    @Command
    fun setNavigationBar(invoke: Invoke) {
        val args = invoke.getArgs()
        val color = args.optString("color", null)
        val style = args.optString("style", null)

        runOnUiThread {
            val window = getWindow() ?: return@runOnUiThread

            if (color != null) {
                window.navigationBarColor = ColorUtils.parseColor(color)
                currentNavBarColor = color
            }

            if (style != null) {
                currentNavBarStyle = style
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ColorUtils.setAppearance(window, style, "navigation")
                }
            }
        }

        invoke.resolve()
    }

    @Command
    fun setSystemBars(invoke: Invoke) {
        val args = invoke.getArgs()
        val statusBar = args.getJSObject("status_bar")
        val navigationBar = args.getJSObject("navigation_bar")

        runOnUiThread {
            val window = getWindow() ?: return@runOnUiThread

            if (statusBar != null) {
                statusBar.optString("color", null)?.let {
                    window.statusBarColor = ColorUtils.parseColor(it)
                    currentStatusBarColor = it
                }
                statusBar.optString("style", null)?.let {
                    currentStatusBarStyle = it
                    ColorUtils.setAppearance(window, it, "status")
                }
                if (statusBar.has("hidden")) {
                    currentStatusBarHidden = statusBar.optBoolean("hidden", false)
                }
            }

            if (navigationBar != null) {
                navigationBar.optString("color", null)?.let {
                    window.navigationBarColor = ColorUtils.parseColor(it)
                    currentNavBarColor = it
                }
                navigationBar.optString("style", null)?.let {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        currentNavBarStyle = it
                        ColorUtils.setAppearance(window, it, "navigation")
                    }
                }
                if (navigationBar.has("hidden")) {
                    currentNavBarHidden = navigationBar.optBoolean("hidden", false)
                }
            }
        }

        invoke.resolve()
    }

    @Command
    fun getSystemBars(invoke: Invoke) {
        val ret = JSObject()
        val sb = JSObject()
        sb.put("color", currentStatusBarColor)
        sb.put("style", currentStatusBarStyle)
        sb.put("hidden", currentStatusBarHidden)
        ret.put("status_bar", sb)

        val nb = JSObject()
        nb.put("color", currentNavBarColor)
        nb.put("style", currentNavBarStyle)
        nb.put("hidden", currentNavBarHidden)
        ret.put("navigation_bar", nb)

        invoke.resolve(ret)
    }

    @Command
    fun enableEdgeToEdge(invoke: Invoke) {
        val args = invoke.getArgs()
        val enabled = args.optBoolean("enabled", true)

        runOnUiThread {
            val window = getWindow() ?: return@runOnUiThread
            val decorView = window.decorView

            if (enabled) {
                WindowCompat.setDecorFitsSystemWindows(window, false)
                window.statusBarColor = Color.TRANSPARENT
                window.navigationBarColor = Color.TRANSPARENT
            } else {
                WindowCompat.setDecorFitsSystemWindows(window, true)
            }
        }

        invoke.resolve()
    }

    @Command
    fun setFullscreen(invoke: Invoke) {
        val args = invoke.getArgs()
        val fullscreen = args.optBoolean("fullscreen", false)

        runOnUiThread {
            val window = getWindow() ?: return@runOnUiThread
            val decorView = window.decorView

            if (fullscreen) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    window.insetsController?.let { controller ->
                        controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                        controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    }
                } else {
                    @Suppress("DEPRECATION")
                    decorView.systemUiVisibility = (
                        View.SYSTEM_UI_FLAG_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    )
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                } else {
                    @Suppress("DEPRECATION")
                    decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
                }
            }
        }

        invoke.resolve()
    }

    @Command
    fun hideSystemBars(invoke: Invoke) {
        runOnUiThread {
            val window = getWindow() ?: return@runOnUiThread
            val decorView = window.decorView
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
            } else {
                @Suppress("DEPRECATION")
                decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_IMMERSIVE
                )
            }
        }
        invoke.resolve()
    }

    @Command
    fun showSystemBars(invoke: Invoke) {
        runOnUiThread {
            val window = getWindow() ?: return@runOnUiThread
            val decorView = window.decorView
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
            } else {
                @Suppress("DEPRECATION")
                decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
            }
        }
        invoke.resolve()
    }
}
