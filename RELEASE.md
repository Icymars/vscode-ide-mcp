# Versioning e rilascio

## Politica di versioning (SemVer)

- **MAJOR** (`version:major`): modifiche breaking — rimozione/renaming di tool,
  cambio del protocollo del bridge (porta, formato JSON).
- **MINOR** (`version:minor`): nuove funzionalità — nuovi tool o capacità
  aggiuntive senza rompere gli esistenti.
- **PATCH** (`version:patch`): correzioni di bug, senza nuove funzionalità.

Ogni bump crea automaticamente (tramite `npm version`):
1. Aggiornamento del campo `version` in `package.json` e `package-lock.json`.
2. Un commit Git `chore(release): X.Y.Z`.
3. Un tag Git `vX.Y.Z`.

Così la traccia di tutte le major e minor resta nel log e nei tag.

## Procedura di rilascio

1. Aggiorna la voce in `CHANGELOG.md` (nuova sezione in cima col numero di versione).
2. Esegui il bump:
   ```bash
   npm run version:minor   # o version:major / version:patch
   git push && git push --tags
   ```
3. Il tag `vX.Y.Z` scatta la pipeline `.github/workflows/release.yml`:
   - build + confeziona il `.vsix`
   - crea la **GitHub Release** allegando il `.vsix` (scaricabile da tutti)
   - pubblica sul **VS Code Marketplace** (`vsce publish`, richiede il secret
     `VSCE_PUBLISHER_TOKEN` del publisher `RiccardoStatuto`)

## Note

- La pipeline usa il token del publisher come secret GitHub
  (`VSCE_PUBLISHER_TOKEN`). Il token si ottiene da
  [marketplace.visualstudio.com](https://marketplace.visualstudio.com) →
  Publisher → `RiccardoStatuto` → sezione token (pulsante "Regenerate").
- Il `.vsix` della release è scaricabile dalla pagina Releases di GitHub:
  installabile ovunque con `code --install-extension <file.vsix>`.
