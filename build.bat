@echo Build VS Code Plugin
@echo ====================

npm run compile && npm i -g vsce && vsce package --pre-release

@echo =================
@echo Building Finished