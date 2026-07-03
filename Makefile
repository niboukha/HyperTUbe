COMPOSE      = docker compose -f docker-compose.yml
BACKEND      = backend
FRONTEND     = frontend
DB           = db
REDIS        = redis
MANAGE       = $(COMPOSE) exec $(BACKEND) python3 manage.py
NPM          = $(COMPOSE) exec $(FRONTEND) npm

.DEFAULT_GOAL := all

.PHONY: all help check-env urls build up down stop restart ps status logs logs-backend logs-frontend logs-celery logs-db clean fclean re backend-shell frontend-shell db-shell redis-shell manage npm migrate makemigrations createsuperuser test shell django-shell lint build-frontend install-frontend

all: up

help:
	@printf "Hypertube Makefile\n\n"
	@printf "Stack:\n"
	@printf "  make                  Start the stack in detached mode\n"
	@printf "  make build            Build images and start the stack\n"
	@printf "  make up               Start the stack in detached mode\n"
	@printf "  make down             Stop and remove containers\n"
	@printf "  make stop             Stop containers without removing them\n"
	@printf "  make restart          Restart the stack\n"
	@printf "  make ps               Show compose status\n"
	@printf "  make status           Show compose status and local service URLs\n"
	@printf "  make urls             Print local service URLs\n\n"
	@printf "Logs:\n"
	@printf "  make logs             Follow logs for all services\n"
	@printf "  make logs-backend     Follow backend logs\n"
	@printf "  make logs-frontend    Follow frontend logs\n"
	@printf "  make logs-celery      Follow Celery worker and beat logs\n"
	@printf "  make logs-db          Follow PostgreSQL logs\n\n"
	@printf "Shells:\n"
	@printf "  make backend-shell    Open a shell in the backend container\n"
	@printf "  make frontend-shell   Open a shell in the frontend container\n"
	@printf "  make db-shell         Open psql in the PostgreSQL container\n"
	@printf "  make redis-shell      Open redis-cli in the Redis container\n"
	@printf "  make django-shell     Open Django's interactive shell\n\n"
	@printf "Backend:\n"
	@printf "  make migrate          Run Django migrations\n"
	@printf "  make makemigrations   Create Django migrations\n"
	@printf "  make createsuperuser  Create a Django superuser\n"
	@printf "  make test             Run Django tests\n"
	@printf "  make manage CMD='...' Run an arbitrary manage.py command\n\n"
	@printf "Frontend:\n"
	@printf "  make lint             Run frontend linting\n"
	@printf "  make build-frontend   Build the Next.js app\n"
	@printf "  make install-frontend Install frontend dependencies\n"
	@printf "  make npm CMD='...'    Run an arbitrary npm command\n\n"
	@printf "Maintenance:\n"
	@printf "  make check-env        Verify that .env exists\n"
	@printf "  make clean            Stop services and remove stack volumes/images\n"
	@printf "  make fclean           Clean compose resources and prune Docker\n"
	@printf "  make re               Recreate everything from scratch\n"

check-env:
	@test -f .env || (printf "Missing .env file. Create one from the README example before starting the stack.\n" && exit 1)

urls:
	@printf "Frontend:     http://localhost:3000\n"
	@printf "Backend API:  http://localhost:8000\n"
	@printf "Django admin: http://localhost:8000/admin/\n"
	@printf "Adminer:      http://localhost:8080\n"

build: check-env
	$(COMPOSE) up -d --build

up: check-env
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

stop:
	$(COMPOSE) stop

restart:
	$(COMPOSE) restart

ps:
	$(COMPOSE) ps

status: ps urls

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f $(BACKEND)

logs-frontend:
	$(COMPOSE) logs -f $(FRONTEND)

logs-celery:
	$(COMPOSE) logs -f celery celery-beat

logs-db:
	$(COMPOSE) logs -f $(DB)

backend-shell:
	$(COMPOSE) exec $(BACKEND) sh

frontend-shell:
	$(COMPOSE) exec $(FRONTEND) sh

db-shell:
	$(COMPOSE) exec $(DB) sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

redis-shell:
	$(COMPOSE) exec $(REDIS) redis-cli

manage:
	@test -n "$(CMD)" || (printf "Usage: make manage CMD='check'\n" && exit 1)
	$(MANAGE) $(CMD)

npm:
	@test -n "$(CMD)" || (printf "Usage: make npm CMD='run lint'\n" && exit 1)
	$(NPM) $(CMD)

migrate:
	$(MANAGE) migrate --noinput

makemigrations:
	$(MANAGE) makemigrations

createsuperuser:
	$(MANAGE) createsuperuser

test:
	$(MANAGE) test

shell django-shell:
	$(MANAGE) shell

lint:
	$(NPM) run lint

build-frontend:
	$(NPM) run build

install-frontend:
	$(NPM) install

clean:
	$(COMPOSE) down -v --rmi all --remove-orphans

fclean: clean
	docker system prune -a --volumes -f

re:
	$(MAKE) fclean
	$(MAKE) build
