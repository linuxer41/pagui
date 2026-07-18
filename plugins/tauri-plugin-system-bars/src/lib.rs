use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

mod commands;
mod desktop;
mod error;

#[cfg(mobile)]
mod mobile;

pub use error::Error;

type Result<T> = std::result::Result<T, Error>;

#[cfg(mobile)]
use tauri::plugin::PluginHandle;

#[cfg(mobile)]
pub struct SystemBarsHandle<R: Runtime>(pub PluginHandle<R>);

#[cfg(mobile)]
impl<R: Runtime> SystemBarsHandle<R> {
    pub fn run(&self, method: &str, payload: impl serde::Serialize) -> crate::Result<serde_json::Value> {
        self.0
            .run_mobile_plugin::<serde_json::Value>(method, payload)
            .map_err(|e| Error::from(format!("Mobile plugin error: {e}")))
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("system-bars")
        .invoke_handler(tauri::generate_handler![
            commands::set_status_bar,
            commands::set_navigation_bar,
            commands::set_system_bars,
            commands::get_system_bars,
            commands::enable_edge_to_edge,
            commands::set_fullscreen,
            commands::hide_system_bars,
            commands::show_system_bars,
        ])
        .setup(|_app, _api| {
            #[cfg(mobile)]
            mobile::init(_app, _api)?;
            Ok(())
        })
        .build()
}
