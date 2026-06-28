.PHONY: install test lint format evaluate docker-up clean

install:
	pip install -r backend/requirements.txt
	cd src && npm install

test:
	cd backend && pytest --cov=app --cov-report=term-missing --cov-report=html

lint:
	cd backend && ruff check .

format:
	cd backend && ruff format .

evaluate:
	python backend/scripts/evaluate_rag.py

docker-up:
	docker compose up --build

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -rf backend/htmlcov
	rm -rf backend/.coverage
