# Installer testing checklist

Use this after building installers from a release tag (e.g. DMG from GitHub Actions).

## First-time install (no prior app)

- [ ] **macOS (Intel or Apple Silicon)**  
  - [ ] Download DMG from the release, open it, drag Confidant to Applications.  
  - [ ] First launch: “Downloading default model” screen appears; wait for it to finish.  
  - [ ] User selector appears; create or select a user and enter password.  
  - [ ] Chat opens; send a message and confirm the assistant replies (model is working).  
  - [ ] Open Settings: AI model shows as ready; knowledge base shows as ready if bundled.  
- [ ] **Windows**  
  - [ ] Download MSI or NSIS installer from the release and run it.  
  - [ ] First launch: “Downloading default model” screen appears; wait for it to finish.  
  - [ ] User selector appears; create or select a user and enter password.  
  - [ ] Chat opens; send a message and confirm the assistant replies.  
  - [ ] Open Settings: AI model and knowledge base show as expected.

## Upgrade (had a previous version)

- [ ] Install over existing app (or remove old app first, then install).  
- [ ] Launch: if model was already downloaded, app should go straight to user selector or chat (no download screen).  
- [ ] Confirm chat and Settings still work.

## Notes

- If “Downloading default model” never finishes, check network and that the Hugging Face URL in the app is reachable.  
- If the app shows “Not Downloaded” for the model after a successful download, report the OS and installer type.
