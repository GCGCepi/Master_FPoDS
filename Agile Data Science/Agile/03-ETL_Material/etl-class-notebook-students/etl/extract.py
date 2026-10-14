"""EXTRACT: get the raw data into DataFrames, without cleaning it."""
import urllib.error
import urllib.request
from pathlib import Path

import pandas as pd

BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"


def download_eurostat(code: str, dest_dir: Path) -> Path:
    """Download a Eurostat dataset as TSV into ``dest_dir`` and return its path.

    Raises ``RuntimeError`` with a readable message if the download fails
    (no network, dataset withdrawn or changed).
    """
    url = f"{BASE}/{code}?format=TSV&lang=en"
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{code}.tsv"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            body = resp.read()
    except (urllib.error.URLError, TimeoutError) as err:
        raise RuntimeError(f"Could not download '{code}': {err}") from err
    if not body.strip():
        raise RuntimeError(f"Empty response for '{code}': the dataset may not exist.")
    tmp = dest.with_suffix(".tsv.tmp")
    tmp.write_bytes(body)
    tmp.replace(dest)
    return dest


def read_long_csv(path: Path) -> pd.DataFrame:
    """Long CSV (one row per country and year). ':' means 'not available'."""
    return pd.read_csv(path, na_values=":", usecols=["TIME", "GEO", "Value"])


def read_raw_tsv(path: Path) -> pd.DataFrame:
    """Raw Eurostat TSV: wide (one column per year), flags inside the cells.

    Everything is read as text (``dtype=str``) so pandas does not guess types
    on values like ``5.98 d`` or ``: u``.
    """
    df = pd.read_csv(path, sep="\t", dtype=str)
    df.columns = [c.strip() for c in df.columns]
    return df.rename(columns={df.columns[0]: "geo"})
