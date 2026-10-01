"""SQLAlchemy models. Imported for metadata; fields arrive with the schema milestone.

An empty module still needs to exist so startup can import it. The real tables
are defined below once the schema is in place — this file is the single models module.
"""

# Models are appended in M2. The import must succeed at M0, so keep Base usage lazy.
from app.db import Base  # noqa: F401
