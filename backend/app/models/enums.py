import enum


class DisciplineEnum(str, enum.Enum):
    CIVIL = "civil"
    PIPING = "piping"
    ELECTRICAL = "electrical"
    INSTRUMENTATION = "instrumentation"
    HSE = "hse"
    OTHER = "other"


class SourceTypeEnum(str, enum.Enum):
    PDF = "pdf"
    XLSX = "xlsx"
    TEXT = "text"
    SCAN = "scan"
    VOICE = "voice"


class DecisionEnum(str, enum.Enum):
    AUTO = "auto"
    REVIEW = "review"
    REJECTED = "rejected"


class EventTypeEnum(str, enum.Enum):
    START = "start"
    FINISH = "finish"


class UserRoleEnum(str, enum.Enum):
    SUPERVISOR = "supervisor"
    PLANNER = "planner"
    ADMIN = "admin"
