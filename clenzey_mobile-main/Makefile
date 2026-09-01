# Clenzey Mobile Monorepo — Makefile
# Usage: make <target>

.PHONY: install typecheck test lint clean consumer partner \
        consumer-start consumer-expo-go consumer-web consumer-android consumer-build-dev-apk consumer-build-preview consumer-build-prod \
        partner-start partner-android partner-build-preview partner-build-prod \
        packages-typecheck verify export-consumer export-partner

# ─── Setup ────────────────────────────────────────────────────────────────────

## Install all workspace dependencies
install:
	pnpm install

## Clean all build artifacts and caches
clean:
	pnpm -r run clean
	rm -rf node_modules/.cache
	rm -rf apps/consumer/.expo
	rm -rf apps/partner/.expo

## Remove node_modules and reinstall fresh
reinstall:
	rm -rf node_modules
	rm -rf apps/consumer/node_modules
	rm -rf apps/partner/node_modules
	rm -rf packages/*/node_modules
	pnpm install

# ─── Quality ──────────────────────────────────────────────────────────────────

## Run TypeScript checks across all packages
typecheck:
	pnpm -r run typecheck

## Run all tests across the monorepo
test:
	pnpm -r run test

## Run linting across all packages
lint:
	pnpm -r run lint

## Run all quality checks (typecheck + test)
verify: typecheck test

# ─── Consumer App ─────────────────────────────────────────────────────────────

## Start the consumer app dev server
consumer-start:
	pnpm --filter @clenzey/consumer start

## Start the consumer app in Expo Go (scan QR code on device)
consumer-expo-go:
	pnpm --filter @clenzey/consumer expo-go

## Start the consumer app web dev server
consumer-web:
	pnpm --filter @clenzey/consumer web

## Run consumer app on Android emulator
consumer-android:
	pnpm --filter @clenzey/consumer android

## TypeScript check consumer app only
consumer-typecheck:
	pnpm --filter @clenzey/consumer typecheck

## Run consumer app tests only
consumer-test:
	pnpm --filter @clenzey/consumer test

## Export consumer app JS bundle (verifies bundling works)
export-consumer:
	cd apps/consumer && npx expo export --platform android

## Build consumer debug APK locally (for physical device testing)
consumer-build-dev-apk:
	chmod +x scripts/build-consumer-dev-apk.sh
	./scripts/build-consumer-dev-apk.sh

## Build consumer APK (preview) via EAS
consumer-build-preview:
	cd apps/consumer && eas build --profile preview --platform android

## Build consumer AAB (production) via EAS
consumer-build-prod:
	cd apps/consumer && eas build --profile production --platform android

# ─── Partner App ──────────────────────────────────────────────────────────────

## Start the partner app dev server
partner-start:
	pnpm --filter @clenzey/partner start

## Run partner app on Android emulator
partner-android:
	pnpm --filter @clenzey/partner android

## TypeScript check partner app only
partner-typecheck:
	pnpm --filter @clenzey/partner typecheck

## Run partner app tests only
partner-test:
	pnpm --filter @clenzey/partner test

## Export partner app JS bundle (verifies bundling works)
export-partner:
	cd apps/partner && npx expo export --platform android

## Build partner APK (preview) via EAS
partner-build-preview:
	cd apps/partner && eas build --profile preview --platform android

## Build partner AAB (production) via EAS
partner-build-prod:
	cd apps/partner && eas build --profile production --platform android

# ─── Shared Packages ─────────────────────────────────────────────────────────

## TypeScript check shared packages only
packages-typecheck:
	pnpm --filter './packages/*' run typecheck

## Run shared package tests only
packages-test:
	pnpm --filter './packages/*' run test

# ─── Utilities ────────────────────────────────────────────────────────────────

## Show workspace package list
list:
	pnpm ls -r --depth -1

## Update all dependencies interactively
update:
	pnpm update -r --interactive

## Show help (list all targets)
help:
	@echo "Clenzey Mobile Monorepo"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install all dependencies"
	@echo "  make clean            Clean build artifacts"
	@echo "  make reinstall        Remove node_modules and reinstall"
	@echo ""
	@echo "Quality:"
	@echo "  make typecheck        TypeScript check all packages"
	@echo "  make test             Run all tests"
	@echo "  make lint             Run linting"
	@echo "  make verify           Run typecheck + test"
	@echo ""
	@echo "Consumer App:"
	@echo "  make consumer-start          Start dev server"
	@echo "  make consumer-expo-go        Start dev server for Expo Go"
	@echo "  make consumer-web            Start web dev server"
	@echo "  make consumer-android        Run on Android emulator"
	@echo "  make consumer-typecheck      TypeScript check"
	@echo "  make consumer-test           Run tests"
	@echo "  make export-consumer         Export JS bundle"
	@echo "  make consumer-build-dev-apk   Build debug APK locally"
	@echo "  make consumer-build-preview  Build APK via EAS"
	@echo "  make consumer-build-prod     Build AAB via EAS"
	@echo ""
	@echo "Partner App:"
	@echo "  make partner-start           Start dev server"
	@echo "  make partner-android         Run on Android emulator"
	@echo "  make partner-typecheck       TypeScript check"
	@echo "  make partner-test            Run tests"
	@echo "  make export-partner          Export JS bundle"
	@echo "  make partner-build-preview   Build APK via EAS"
	@echo "  make partner-build-prod      Build AAB via EAS"
	@echo ""
	@echo "Packages:"
	@echo "  make packages-typecheck      TypeScript check packages"
	@echo "  make packages-test           Run package tests"
	@echo ""
	@echo "Utilities:"
	@echo "  make list             Show workspace packages"
	@echo "  make update           Update dependencies"
	@echo "  make help             Show this help"
