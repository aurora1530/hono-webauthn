.PHONY: aaguid
aaguid:
	docker compose exec app npm run update:aaguid && ./scripts/commitAAGUID.sh