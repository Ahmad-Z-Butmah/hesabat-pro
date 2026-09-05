from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ReportsSummaryCard(BaseModel):
    label: str
    value: Decimal = Decimal("0.00")
    count: int = 0


class ReportsMethod(BaseModel):
    label: str
    amount: Decimal = Decimal("0.00")
    pct: int = 0


class ReportsChartBar(BaseModel):
    label: str
    income: Decimal = Decimal("0.00")
    expense: Decimal = Decimal("0.00")


class ReportsRow(BaseModel):
    """صف حركة مالية مهيأ للعرض داخل جداول ونوافذ التقارير."""

    id: int
    type: str
    dir: str  # in | out
    method: str  # كاش | شيك
    no: str | None = None
    unit: str = "—"
    party: str | None = None
    cat: str = "—"
    g: date
    amount: Decimal = Decimal("0.00")
    status: str
    statusRaw: str


class ReportsPositionMetric(BaseModel):
    id: str
    label: str
    desc: str
    value: Decimal = Decimal("0.00")
    items: list[ReportsRow] = []


class ReportsTrackerRow(BaseModel):
    no: str | None = None
    dir: str
    party: str | None = None
    unit: str = "—"
    amount: Decimal = Decimal("0.00")
    g: date
    status: str


class ReportsWeekTracker(BaseModel):
    rows: list[ReportsTrackerRow] = []
    cashed_count: int = 0
    cashed_value: Decimal = Decimal("0.00")
    pending_count: int = 0
    pending_value: Decimal = Decimal("0.00")


class ReportsDuePayment(BaseModel):
    party: str | None = None
    unit: str = "—"
    note: str = ""
    cat: str = "—"
    method: str = "شيك"
    amount: Decimal = Decimal("0.00")
    day: str = ""
    due_date: date
    attach: bool = False


class ReportsCashedCheque(BaseModel):
    dir: str
    no: str | None = None
    party: str | None = None
    unit: str = "—"
    cat: str = "—"
    reason: str | None = None
    issued: date
    cashed: date
    deferred: bool = False
    amount: Decimal = Decimal("0.00")


class ReportsCashedCheques(BaseModel):
    rows: list[ReportsCashedCheque] = []
    count: int = 0
    total: Decimal = Decimal("0.00")


class ReportsPropertyRow(BaseModel):
    name: str
    owner: str = ""
    income: Decimal = Decimal("0.00")
    expense: Decimal = Decimal("0.00")
    net: Decimal = Decimal("0.00")
    rate: int = 0
    late: Decimal = Decimal("0.00")


class ReportsPropertyHighlight(BaseModel):
    icon: str
    title: str
    name: str
    value: Decimal = Decimal("0.00")
    color: str


class ReportsPropertyPerformance(BaseModel):
    props: list[ReportsPropertyRow] = []
    highlights: list[ReportsPropertyHighlight] = []


class ReportsQuarter(BaseModel):
    label: str
    rev: Decimal = Decimal("0.00")
    cost: Decimal = Decimal("0.00")
    net: Decimal = Decimal("0.00")
    pct: int = 0


class ReportsYearlyProfit(BaseModel):
    cost: Decimal = Decimal("0.00")
    rev: Decimal = Decimal("0.00")
    net: Decimal = Decimal("0.00")
    pct: int = 0
    quarters: list[ReportsQuarter] = []


class ReportsInsight(BaseModel):
    icon: str
    tone: str
    kind: str
    amount: Decimal = Decimal("0.00")
    party: str | None = None
    text: str = ""


class ProjectReports(BaseModel):
    total_count: int = 0
    summary: list[ReportsSummaryCard] = []
    methods: list[ReportsMethod] = []
    methods_total: Decimal = Decimal("0.00")
    insights: list[ReportsInsight] = []
    bars: list[ReportsChartBar] = []
    position: list[ReportsPositionMetric] = []
    week_tracker: ReportsWeekTracker = ReportsWeekTracker()
    due_payments: list[ReportsDuePayment] = []
    due_total: Decimal = Decimal("0.00")
    due_count: int = 0
    cashed_cheques: ReportsCashedCheques = ReportsCashedCheques()
    property_performance: ReportsPropertyPerformance = ReportsPropertyPerformance()
    yearly_profit: ReportsYearlyProfit | None = None
    rows: list[ReportsRow] = []
