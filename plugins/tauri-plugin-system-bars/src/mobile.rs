use tauri::{AppHandle, Manager, Runtime};

use crate::commands::{SystemBarsConfig, SystemBarsState};
use crate::{Error, Result, SystemBarsHandle};

pub fn init<R: Runtime>(
    app: &AppHandle<R>,
    api: tauri::plugin::PluginApi<R, ()>,
) -> Result<()> {
    let handle = api
        .register_android_plugin("io.github.linuxer.systembars", "SystemBarsPlugin")
        .map_err(|e| Error::from(format!("Failed to register Android plugin: {e}")))?;
    app.manage(SystemBarsHandle::<R>(handle));
    Ok(())
}

pub fn set_status_bar<R: Runtime>(
    app: &AppHandle<R>,
    color: Option<String>,
    style: Option<String>,
) -> Result<()> {
    let handle = app.state::<SystemBarsHandle<R>>();
    handle.run(
        "setStatusBar",
        serde_json::json!({ "color": color, "style": style }),
    )?;
    Ok(())
}

pub fn set_navigation_bar<R: Runtime>(
    app: &AppHandle<R>,
    color: Option<String>,
    style: Option<String>,
) -> Result<()> {
    let handle = app.state::<SystemBarsHandle<R>>();
    handle.run(
        "setNavigationBar",
        serde_json::json!({ "color": color, "style": style }),
    )?;
    Ok(())
}

pub fn set_system_bars<R: Runtime>(
    app: &AppHandle<R>,
    config: SystemBarsConfig,
) -> Result<()> {
    let handle = app.state::<SystemBarsHandle<R>>();
    handle.run("setSystemBars", serde_json::to_value(config).unwrap())?;
    Ok(())
}

pub fn get_system_bars<R: Runtime>(app: &AppHandle<R>) -> Result<SystemBarsState> {
    let handle = app.state::<SystemBarsHandle<R>>();
    let val = handle.run("getSystemBars", serde_json::json!({}))?;
    serde_json::from_value(val).map_err(|e| Error::from(format!("Deserialize error: {e}")))
}

pub fn enable_edge_to_edge<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> Result<()> {
    let handle = app.state::<SystemBarsHandle<R>>();
    handle.run(
        "enableEdgeToEdge",
        serde_json::json!({ "enabled": enabled }),
    )?;
    Ok(())
}

pub fn set_fullscreen<R: Runtime>(app: &AppHandle<R>, fullscreen: bool) -> Result<()> {
    let handle = app.state::<SystemBarsHandle<R>>();
    handle.run(
        "setFullscreen",
        serde_json::json!({ "fullscreen": fullscreen }),
    )?;
    Ok(())
}

pub fn hide_system_bars<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    let handle = app.state::<SystemBarsHandle<R>>();
    handle.run("hideSystemBars", serde_json::json!({}))?;
    Ok(())
}

pub fn show_system_bars<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    let handle = app.state::<SystemBarsHandle<R>>();
    handle.run("showSystemBars", serde_json::json!({}))?;
    Ok(())
}
