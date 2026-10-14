"""LOAD: save the clean table where it can be reused."""
import sqlite3
from pathlib import Path

import pandas as pd


def save_all(df: pd.DataFrame, out_dir: Path, name: str = "education_spending") -> dict:
    """Save ``df`` as CSV, Parquet and SQLite. Returns {format: path}."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {
        "csv": out_dir / f"{name}.csv",
        "parquet": out_dir / f"{name}.parquet",
        "sqlite": out_dir / f"{name}.db",
    }
    df.to_csv(paths["csv"], index=False)
    df.to_parquet(paths["parquet"], index=False)
    con = sqlite3.connect(paths["sqlite"])
    try:
        df.to_sql(name, con, if_exists="replace", index=False)
    finally:
        con.close()
    return paths


def roundtrip_ok(df: pd.DataFrame, parquet_path: Path) -> bool:
    """Read the Parquet file back and check it is identical to ``df``."""
    back = pd.read_parquet(parquet_path)
    return back.reset_index(drop=True).equals(df.reset_index(drop=True))
