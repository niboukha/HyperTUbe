all:
	docker compose -f docker-compose.yml up -d
down:
	docker compose -f docker-compose.yml down
logs:
	docker compose -f docker-compose.yml logs -f
restart:
	docker compose -f docker-compose.yml restart
ps:
	docker compose -f docker-compose.yml ps
clean:
	docker compose -f docker-compose.yml down -v --rmi all --remove-orphans
stop:
	docker compose -f docker-compose.yml stop
fclean: clean
	docker system prune -a --volumes -f
re:
	make fclean
	make all
	