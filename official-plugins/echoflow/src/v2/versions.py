IR_VERSION = "2.0.0-alpha.0"
SCHEMA_VERSION = "2.0.0-alpha.0"


def major(version: str) -> int:
    v = (version or "").strip()
    if not v:
        return 0
    head = v.split("-", 1)[0]
    first = head.split(".", 1)[0]
    try:
        return int(first)
    except Exception:
        return 0


def is_schema_compatible(schema_version: str) -> bool:
    return major(schema_version) == major(SCHEMA_VERSION)


def is_ir_compatible(ir_version: str) -> bool:
    return major(ir_version) == major(IR_VERSION)

