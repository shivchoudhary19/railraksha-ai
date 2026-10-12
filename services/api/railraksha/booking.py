import hashlib
import secrets
import uuid
from typing import Annotated, Any, Literal

from cryptography.exceptions import InvalidSignature
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from railraksha.audit_models import BookingGrievance, BookingTicket
from railraksha.auth import Principal, current_user
from railraksha.dependencies import database
from railraksha.shield import get_shield_keypair

Database = Annotated[AsyncSession, Depends(database)]
CurrentUser = Annotated[Principal, Depends(current_user)]

router = APIRouter(prefix="/v1/booking", tags=["booking"])

# --- Demo Timetable Dataset ---

DEMO_TRAINS: list[dict[str, Any]] = [
    {
        "train_number": "12951",
        "train_name": "Mumbai Rajdhani Express",
        "from_station": "NDLS",
        "to_station": "MMCT",
        "departure_time": "16:55",
        "arrival_time": "08:35",
        "duration": "15h 40m",
        "classes": {
            "1A": {"available_seats": 12, "fare": 4750},
            "2A": {"available_seats": 28, "fare": 2850},
            "3A": {"available_seats": 64, "fare": 2050},
        },
    },
    {
        "train_number": "12004",
        "train_name": "Lucknow Shatabdi Express",
        "from_station": "NDLS",
        "to_station": "LKO",
        "departure_time": "06:10",
        "arrival_time": "12:40",
        "duration": "6h 30m",
        "classes": {
            "CC": {"available_seats": 45, "fare": 1165},
            "EC": {"available_seats": 18, "fare": 2125},
        },
    },
    {
        "train_number": "22436",
        "train_name": "Vande Bharat Express",
        "from_station": "NDLS",
        "to_station": "BSB",
        "departure_time": "06:00",
        "arrival_time": "14:00",
        "duration": "8h 00m",
        "classes": {
            "CC": {"available_seats": 82, "fare": 1750},
            "EC": {"available_seats": 24, "fare": 3300},
        },
    },
    {
        "train_number": "12301",
        "train_name": "Howrah Rajdhani Express",
        "from_station": "HWH",
        "to_station": "NDLS",
        "departure_time": "16:50",
        "arrival_time": "10:05",
        "duration": "17h 15m",
        "classes": {
            "1A": {"available_seats": 8, "fare": 4890},
            "2A": {"available_seats": 32, "fare": 2980},
            "3A": {"available_seats": 78, "fare": 2150},
        },
    },
]

# --- Schemas ---


class TrainSearchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    from_station: str = Field(min_length=2, max_length=10)
    to_station: str = Field(min_length=2, max_length=10)
    travel_date: str = Field(min_length=8, max_length=12)


class ClassAvailability(BaseModel):
    available_seats: int
    fare: int


class TrainSearchResult(BaseModel):
    train_number: str
    train_name: str
    from_station: str
    to_station: str
    departure_time: str
    arrival_time: str
    duration: str
    classes: dict[str, ClassAvailability]


class BookTicketInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    train_number: str = Field(min_length=4, max_length=10)
    from_station: str = Field(min_length=2, max_length=10)
    to_station: str = Field(min_length=2, max_length=10)
    travel_date: str = Field(min_length=8, max_length=12)
    journey_class: str = Field(min_length=2, max_length=5)
    passenger_name: str = Field(min_length=2, max_length=80)
    passenger_age: int = Field(ge=1, le=120)
    passenger_gender: Literal["M", "F", "O"]
    idempotency_key: str | None = None


class TicketOutput(BaseModel):
    id: uuid.UUID
    pnr: str
    train_number: str
    train_name: str
    from_station: str
    to_station: str
    travel_date: str
    journey_class: str
    quota: str
    passenger_name: str
    passenger_age: int
    passenger_gender: str
    fare_inr: int
    status: str
    refund_amount: int
    signature: str
    qr_payload: str
    created_at: str


class VerifyTicketInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    qr_payload: str = Field(min_length=20, max_length=1000)


class VerifyTicketOutput(BaseModel):
    valid: bool
    verdict: Literal["authentic", "counterfeit_or_tampered"]
    pnr: str | None = None
    train_number: str | None = None
    passenger_name: str | None = None
    travel_date: str | None = None
    message_en: str
    message_hi: str


class CancelTicketOutput(BaseModel):
    pnr: str
    status: Literal["cancelled"]
    original_fare: int
    cancellation_fee: int
    refund_amount: int
    refund_status: Literal["processed_to_sandbox"]
    message_en: str
    message_hi: str


class GrievanceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pnr: str = Field(min_length=10, max_length=10)
    category: str = Field(min_length=3, max_length=50)
    description: str = Field(min_length=10, max_length=2000)


class GrievanceOutput(BaseModel):
    tracking_id: str
    pnr: str
    category: str
    status: str
    created_at: str


# --- Helper Logic ---


def generate_pnr() -> str:
    # Deterministic 10-digit format starting with railway PRS zones (2, 4, 6, 8)
    zone = secrets.choice(["24", "45", "68", "82"])
    rest = "".join(str(secrets.randbelow(10)) for _ in range(8))
    return f"{zone}{rest}"


def sign_ticket_payload(
    pnr: str, train: str, from_st: str, to_st: str, date: str, name: str, fare: int
) -> tuple[str, str]:
    private_key, public_key = get_shield_keypair()
    raw = (
        f"PNR={pnr}&TRAIN={train}&FROM={from_st}&TO={to_st}"
        f"&DATE={date}&PASSENGER={name}&FARE={fare}"
    )
    digest = hashlib.sha256(raw.encode()).digest()
    sig = private_key.sign(digest).hex()
    qr_payload = f"{raw}&SIG={sig}&PUB={public_key.public_bytes_raw().hex()[:16]}"
    return sig, qr_payload


# --- Endpoints ---


@router.post("/trains/search", response_model=list[TrainSearchResult])
async def search_trains_endpoint(payload: TrainSearchInput) -> list[TrainSearchResult]:
    from_norm = payload.from_station.strip().upper()
    to_norm = payload.to_station.strip().upper()

    results: list[TrainSearchResult] = []
    for train in DEMO_TRAINS:
        # Match if stations coincide or if search is broad
        if (train["from_station"] == from_norm and train["to_station"] == to_norm) or (
            from_norm in ["ANY", "ALL"] or to_norm in ["ANY", "ALL"]
        ):
            classes_map = {
                k: ClassAvailability(available_seats=v["available_seats"], fare=v["fare"])
                for k, v in train["classes"].items()
            }
            results.append(
                TrainSearchResult(
                    train_number=train["train_number"],
                    train_name=train["train_name"],
                    from_station=train["from_station"],
                    to_station=train["to_station"],
                    departure_time=train["departure_time"],
                    arrival_time=train["arrival_time"],
                    duration=train["duration"],
                    classes=classes_map,
                )
            )

    # If no strict match, return default available routes for demo convenience
    if not results:
        for train in DEMO_TRAINS[:2]:
            classes_map = {
                k: ClassAvailability(available_seats=v["available_seats"], fare=v["fare"])
                for k, v in train["classes"].items()
            }
            results.append(
                TrainSearchResult(
                    train_number=train["train_number"],
                    train_name=train["train_name"],
                    from_station=from_norm,
                    to_station=to_norm,
                    departure_time=train["departure_time"],
                    arrival_time=train["arrival_time"],
                    duration=train["duration"],
                    classes=classes_map,
                )
            )

    return results


@router.post("/book", response_model=TicketOutput)
async def book_ticket_endpoint(
    payload: BookTicketInput,
    user: CurrentUser,
    db: Database,
) -> TicketOutput:
    # Server authoritative price calculation
    matched_train = next(
        (t for t in DEMO_TRAINS if t["train_number"] == payload.train_number), None
    )
    train_name = matched_train["train_name"] if matched_train else "Special Express"

    # Base price calculation
    base_fare = 1450
    if matched_train and payload.journey_class in matched_train["classes"]:
        base_fare = matched_train["classes"][payload.journey_class]["fare"]

    pnr = generate_pnr()
    sig, qr_payload = sign_ticket_payload(
        pnr=pnr,
        train=payload.train_number,
        from_st=payload.from_station.upper(),
        to_st=payload.to_station.upper(),
        date=payload.travel_date,
        name=payload.passenger_name,
        fare=base_fare,
    )

    ticket = BookingTicket(
        pnr=pnr,
        train_number=payload.train_number,
        train_name=train_name,
        from_station=payload.from_station.upper(),
        to_station=payload.to_station.upper(),
        travel_date=payload.travel_date,
        journey_class=payload.journey_class.upper(),
        quota="GENERAL",
        passenger_name=payload.passenger_name,
        passenger_age=payload.passenger_age,
        passenger_gender=payload.passenger_gender,
        fare_inr=base_fare,
        status="confirmed",
        refund_amount=0,
        signature=sig,
        qr_payload=qr_payload,
        user_id=user.subject,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return TicketOutput(
        id=ticket.id,
        pnr=ticket.pnr,
        train_number=ticket.train_number,
        train_name=ticket.train_name,
        from_station=ticket.from_station,
        to_station=ticket.to_station,
        travel_date=ticket.travel_date,
        journey_class=ticket.journey_class,
        quota=ticket.quota,
        passenger_name=ticket.passenger_name,
        passenger_age=ticket.passenger_age,
        passenger_gender=ticket.passenger_gender,
        fare_inr=ticket.fare_inr,
        status=ticket.status,
        refund_amount=ticket.refund_amount,
        signature=ticket.signature,
        qr_payload=ticket.qr_payload,
        created_at=ticket.created_at.strftime("%Y-%m-%d %H:%M:%SZ"),
    )


@router.get("/pnr/{pnr}", response_model=TicketOutput)
async def get_pnr_status_endpoint(
    pnr: str,
    db: Database,
) -> TicketOutput:
    ticket = await db.scalar(select(BookingTicket).where(BookingTicket.pnr == pnr))
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PNR not found")

    return TicketOutput(
        id=ticket.id,
        pnr=ticket.pnr,
        train_number=ticket.train_number,
        train_name=ticket.train_name,
        from_station=ticket.from_station,
        to_station=ticket.to_station,
        travel_date=ticket.travel_date,
        journey_class=ticket.journey_class,
        quota=ticket.quota,
        passenger_name=ticket.passenger_name,
        passenger_age=ticket.passenger_age,
        passenger_gender=ticket.passenger_gender,
        fare_inr=ticket.fare_inr,
        status=ticket.status,
        refund_amount=ticket.refund_amount,
        signature=ticket.signature,
        qr_payload=ticket.qr_payload,
        created_at=ticket.created_at.strftime("%Y-%m-%d %H:%M:%SZ"),
    )


@router.post("/verify-ticket", response_model=VerifyTicketOutput)
async def verify_ticket_endpoint(payload: VerifyTicketInput) -> VerifyTicketOutput:
    try:
        parts = dict(item.split("=", 1) for item in payload.qr_payload.split("&") if "=" in item)
        pnr = parts.get("PNR")
        train = parts.get("TRAIN")
        name = parts.get("PASSENGER")
        date = parts.get("DATE")
        sig_hex = parts.get("SIG")

        if not pnr or not train or not sig_hex:
            return VerifyTicketOutput(
                valid=False,
                verdict="counterfeit_or_tampered",
                message_en="Malformed ticket QR payload. Missing mandatory PRS security fields.",
                message_hi="दोषपूर्ण टिकट QR पेलोड। अनिवार्य सुरक्षा फ़ील्ड अनुपस्थित हैं।",
            )

        # Reconstruct signed payload without SIG and PUB
        from_st = parts.get("FROM", "")
        to_st = parts.get("TO", "")
        fare_val = parts.get("FARE", "")
        raw = (
            f"PNR={pnr}&TRAIN={train}&FROM={from_st}&TO={to_st}"
            f"&DATE={date}&PASSENGER={name}&FARE={fare_val}"
        )
        digest = hashlib.sha256(raw.encode()).digest()

        _, public_key = get_shield_keypair()
        sig_bytes = bytes.fromhex(sig_hex)
        public_key.verify(sig_bytes, digest)

        return VerifyTicketOutput(
            valid=True,
            verdict="authentic",
            pnr=pnr,
            train_number=train,
            passenger_name=name,
            travel_date=date,
            message_en="Valid cryptographically signed Indian Railways e-ticket.",
            message_hi="वैध डिजिटल रूप से हस्ताक्षरित भारतीय रेल ई-टिकट।",
        )
    except (InvalidSignature, ValueError, KeyError):
        return VerifyTicketOutput(
            valid=False,
            verdict="counterfeit_or_tampered",
            message_en="SIGNATURE MISMATCH: This ticket has been forged or tampered with!",
            message_hi="हस्ताक्षर बेमेल: यह टिकट जाली है या इसमें अनधिकृत बदलाव किया गया है!",
        )


@router.post("/pnr/{pnr}/cancel", response_model=CancelTicketOutput)
async def cancel_ticket_endpoint(
    pnr: str,
    user: CurrentUser,
    db: Database,
) -> CancelTicketOutput:
    ticket = await db.scalar(select(BookingTicket).where(BookingTicket.pnr == pnr))
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PNR not found")
    if ticket.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket is already cancelled"
        )

    # Standard railway clerkage fee
    clerkage_fee = 120
    refund = max(0, ticket.fare_inr - clerkage_fee)

    ticket.status = "cancelled"
    ticket.refund_amount = refund
    await db.commit()

    return CancelTicketOutput(
        pnr=ticket.pnr,
        status="cancelled",
        original_fare=ticket.fare_inr,
        cancellation_fee=clerkage_fee,
        refund_amount=refund,
        refund_status="processed_to_sandbox",
        message_en=f"Ticket cancelled. ₹{refund} credited to original payment source (Sandbox).",
        message_hi=f"टिकट रद्द किया गया। ₹{refund} मूल भुगतान स्रोत (सैंडबॉक्स) में जमा किया गया।",
    )


@router.post("/grievances", response_model=GrievanceOutput)
async def file_grievance_endpoint(
    payload: GrievanceInput,
    user: CurrentUser,
    db: Database,
) -> GrievanceOutput:
    tracking_id = f"RM-2026-{secrets.token_hex(4).upper()}"
    grievance = BookingGrievance(
        tracking_id=tracking_id,
        pnr=payload.pnr,
        category=payload.category,
        description=payload.description,
        status="registered",
        user_id=user.subject,
    )
    db.add(grievance)
    await db.commit()
    await db.refresh(grievance)

    return GrievanceOutput(
        tracking_id=grievance.tracking_id,
        pnr=grievance.pnr,
        category=grievance.category,
        status=grievance.status,
        created_at=grievance.created_at.strftime("%Y-%m-%d %H:%M:%SZ"),
    )
