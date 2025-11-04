.PHONY: aaguid
aaguid:
	docker compose run app npm run update:aaguid && ./scripts/aaguid/commit.sh