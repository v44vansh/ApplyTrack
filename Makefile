.PHONY: test build dev

test:
	npm run typecheck
	npm test -- --runInBand
	npm run build

build:
	npm run build

dev:
	npm run dev
