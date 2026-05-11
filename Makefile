all:
	docker compose -f compose.yml up -d
down:
	docker compose -f compose.yml down
logs:
	docker compose -f compose.yml logs -f
restart:
	docker compose -f compose.yml restart
ps:
	docker compose -f compose.yml ps
clean:
	docker compose -f compose.yml down -v --rmi all --remove-orphans
stop:
	docker compose -f compose.yml stop
fclean: clean
	docker system prune -a --volumes -f
re:
	make fclean
	make all
	