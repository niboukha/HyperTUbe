COMPOSE = docker compose -f docker-compose.yml

.DEFAULT_GOAL := all

.PHONY: all help build up down logs restart ps clean fclean stop re backend-shell frontend-shell migrate makemigrations createsuperuser test lint build-frontend install-frontend

all: up

help:
	@printf "Available targets:\n"
	@printf "  make               Start the stack in detached mode\n"
	@printf "  make build         Build images and start the stack\n"
	@printf "  make down          Stop and remove containers\n"
	@printf "  make logs          Follow compose logs\n"
	@printf "  make restart       Restart the stack\n"
	@printf "  make ps            Show compose status\n"
	@printf "  make clean         Stop services and remove volumes/images\n"
	@printf "  make fclean        Clean compose resources and prune Docker\n"
	@printf "  make re            Recreate everything from scratch\n"
	@printf "  make migrate       Run Django migrations\n"
	@printf "  make test          Run backend tests\n"
	@printf "  make lint          Run frontend linting\n"

build:
	$(COMPOSE) up -d --build

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

restart:
	$(COMPOSE) restart

ps:
	$(COMPOSE) ps

clean:
	$(COMPOSE) down -v --rmi all --remove-orphans

stop:
	$(COMPOSE) stop

backend-shell:
	$(COMPOSE) exec backend sh

frontend-shell:
	$(COMPOSE) exec frontend sh

migrate:
	$(COMPOSE) exec backend python3 manage.py migrate --noinput

makemigrations:
	$(COMPOSE) exec backend python3 manage.py makemigrations

createsuperuser:
	$(COMPOSE) exec backend python3 manage.py createsuperuser

test:
	$(COMPOSE) exec backend python3 manage.py test

lint:
	$(COMPOSE) exec frontend npm run lint

build-frontend:
	$(COMPOSE) exec frontend npm run build

install-frontend:
	$(COMPOSE) exec frontend npm install

fclean: clean
	docker system prune -a --volumes -f

re:
	$(MAKE) fclean
	$(MAKE) all
	