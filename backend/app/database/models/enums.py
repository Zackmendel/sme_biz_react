from enum import Enum


class NigeriaCityList(str, Enum):
    MINNA = "Minna"
    SULEJA = "Suleja"
    BIDA = "Bida"
    KONTAGORA = "Kontagora"
    LAPAI = "Lapai"
    MOKWA = "Mokwa"
    NEW_BUSSA = "New Bussa"
    AGAIE = "Agaie"
    PAIKO = "Paiko"
    KAGARA = "Kagara"
    LAGOS = "Lagos"
    ABUJA = "Abuja"
    PORT_HARCOURT = "Port Harcourt"
    KANO = "Kano"
    IBADAN = "Ibadan"
    ENUGU = "Enugu"
    KADUNA = "Kaduna"
    JOS = "Jos"
    ILORIN = "Ilorin"


class BusinessIndustry(str, Enum):
    RETAIL = "retail"
    FOOD_SERVICES = "food_services"
    SERVICES = "services"
    DISTRIBUTORS = "distributors"
    IT = "IT"


class BusinessScale(str, Enum):
    SOLE_TRADER = "sole_trader"
    MICRO = "micro"
    SMALL = "small"
    MEDIUM = "medium"


class RoleEnum(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    STAFF = "staff"
    VIEWER = "viewer"


class StatusEnum(str, Enum):
    PERMANENT = "permanent"
    PART_TIME = "part_time"
    INTERN = "intern"
    CONTRACT = "contract"


class PeriodEnum(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class PaymentType(str, Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    CARD = "card"
    CREDIT = "credit"
