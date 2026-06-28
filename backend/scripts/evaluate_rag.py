"""
RAG Evaluation Script using RAGAs

Evaluates the RAG pipeline's quality using the RAGAs framework.
Requires OPENAI_API_KEY to be set for evaluation metrics.
"""
import json
import os
import asyncio
from typing import List, Dict

# Set up environment for testing
os.environ["TESTING"] = "1"


async def run_evaluation() -> None:
    print("Starting RAG Pipeline Evaluation...")

    # Check if OPENAI_API_KEY is set
    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY is required for RAGAs evaluation.")
        print("Please set it in your environment or .env file.")
        return

    # Lazy imports to avoid import errors when dependencies aren't installed
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import (
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        )
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    except ImportError as e:
        print(f"ERROR: Missing required dependencies: {e}")
        print("Install with: pip install ragas datasets langchain-openai")
        return

    from app.services.vector_store_simple import simple_vector_store

    # Load evaluation questions
    eval_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'eval_questions.json')
    try:
        with open(eval_file, 'r') as f:
            eval_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find evaluation data at {eval_file}")
        return

    questions = [item["question"] for item in eval_data]
    ground_truths = [item["ground_truth"] for item in eval_data]

    answers: List[str] = []
    contexts: List[List[str]] = []

    print(f"Processing {len(questions)} questions...")
    for q in questions:
        # Retrieve context using the vector store instance
        docs = await simple_vector_store.search_documents(q, top_k=3)
        context_str = [doc["content"] for doc in docs]
        contexts.append(context_str if context_str else ["No context found"])

        # Generate a simple answer based on retrieved context
        if context_str:
            answers.append(f"Based on medical knowledge: {' '.join(context_str[:2])}")
        else:
            answers.append("No relevant medical knowledge found for this query.")

    # Create huggingface dataset required by RAGAs
    data = {
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths,
    }

    dataset = Dataset.from_dict(data)

    print("Evaluating with RAGAs...")

    # Langchain models for evaluation
    evaluator_llm = ChatOpenAI(model="gpt-4o-mini")
    evaluator_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    result = evaluate(
        dataset,
        metrics=[
            context_precision,
            context_recall,
            faithfulness,
            answer_relevancy,
        ],
        llm=evaluator_llm,
        embeddings=evaluator_embeddings,
    )

    # Print results
    print("\n" + "=" * 50)
    print("RAG EVALUATION RESULTS")
    print("=" * 50)

    result_dict = dict(result)
    for metric, score in result_dict.items():
        if isinstance(score, float):
            print(f"{metric}: {score:.4f}")
        else:
            print(f"{metric}: {score}")

    # Save results
    report_dir = os.path.join(os.path.dirname(__file__), '..', 'reports')
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, 'rag_eval_results.json')

    try:
        serializable = {}
        for k, v in result_dict.items():
            try:
                json.dumps(v)
                serializable[k] = v
            except (TypeError, ValueError):
                serializable[k] = str(v)

        with open(report_path, 'w') as f:
            json.dump(serializable, f, indent=4)
        print(f"\nResults saved to {report_path}")
    except Exception as e:
        print(f"\nCould not save results as JSON: {e}")


if __name__ == "__main__":
    asyncio.run(run_evaluation())
