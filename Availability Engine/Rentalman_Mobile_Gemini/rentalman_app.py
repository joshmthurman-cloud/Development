import streamlit as st
from datetime import date, timedelta

# --- APP CONFIGURATION ---
st.set_page_config(
    page_title="Skyworks RentalMan Mobile",
    page_icon="🏗️",
    layout="centered"
)

# --- MOCK DATA (Simulating RentalMan ERP Return) ---
# In a real app, this would be fetched via REST API from your AS/400 or SQL backend.
EQUIPMENT_CATEGORIES = {
    "Aerial Lifts": "🚀",
    "Earthmoving": "🚜",
    "Forklifts": "📦",
    "General Tools": "🛠️",
    "Power & HVAC": "⚡"
}

EQUIPMENT_DATABASE = {
    "Aerial Lifts": [
        {"id": "AL-001", "name": "Genie Z-45/25J", "type": "Articulating Boom", "height": "45 ft", "price_day": 350, "price_week": 950, "image": "https://placehold.co/600x400/007bff/ffffff?text=Genie+Z-45"},
        {"id": "AL-002", "name": "JLG 1930ES", "type": "Electric Scissor", "height": "19 ft", "price_day": 120, "price_week": 350, "image": "https://placehold.co/600x400/007bff/ffffff?text=JLG+1930ES"},
        {"id": "AL-003", "name": "Skyjack SJ3219", "type": "Scissor Lift", "height": "19 ft", "price_day": 115, "price_week": 340, "image": "https://placehold.co/600x400/007bff/ffffff?text=Skyjack+SJ3219"},
    ],
    "Earthmoving": [
        {"id": "EM-001", "name": "Kubota KX040", "type": "Mini Excavator", "weight": "9,000 lbs", "price_day": 450, "price_week": 1300, "image": "https://placehold.co/600x400/ff9900/ffffff?text=Kubota+Excavator"},
    ]
}

# --- SESSION STATE MANAGEMENT (Navigation) ---
if 'page' not in st.session_state:
    st.session_state.page = 'home'
if 'selected_dates' not in st.session_state:
    st.session_state.selected_dates = (date.today(), date.today() + timedelta(days=1))
if 'selected_category' not in st.session_state:
    st.session_state.selected_category = None
if 'selected_unit' not in st.session_state:
    st.session_state.selected_unit = None
if 'cart' not in st.session_state:
    st.session_state.cart = {}

def navigate_to(page_name):
    st.session_state.page = page_name
    st.rerun()

# --- HEADER COMPONENT (Persistent) ---
def render_header():
    # Top bar container
    with st.container():
        col1, col2 = st.columns([1, 4])
        with col1:
            # Placeholder for Skyworks Logo
            st.markdown("🟦 **SKY**")
        with col2:
            st.markdown("<div style='text-align: right; color: grey;'>⚙️ <b>RentalMan</b> Mobile</div>", unsafe_allow_html=True)

        st.divider()

        # Location Bar
        st.caption("📍 **Current Branch:** Skyworks Cartersville, GA (Change)")

# --- PAGE 1: HOME ---
def render_home():
    st.title("Ready to work?")
    st.markdown("Manage your rentals in real-time.")

    st.write("") # Spacing

    # Big Action Buttons
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📅\nSearch by\nDate", use_container_width=True):
            navigate_to('date_select')
    with col2:
        if st.button("🚜\nBrowse\nEquipment", use_container_width=True):
            navigate_to('categories')

    st.info("ℹ️ Login to view your account specific rates.")

# --- EXTRA PAGE: DATE SELECTION ---
def render_date_selection():
    st.subheader("When do you need it?")

    new_dates = st.date_input(
        "Select Rental Duration",
        value=st.session_state.selected_dates,
        min_value=date.today()
    )

    if len(new_dates) == 2:
        st.session_state.selected_dates = new_dates
        st.success(f"Availability checked for {new_dates[0]} to {new_dates[1]}")

        st.write("")
        if st.button("Show Available Equipment ➜", type="primary", use_container_width=True):
            navigate_to('categories')
    else:
        st.warning("Please select a start and end date.")

    if st.button("← Back"):
        navigate_to('home')

# --- PAGE 2: CATEGORY BROWSER ---
def render_categories():
    st.subheader("Equipment Categories")
    st.text_input("🔍 Search equipment...", placeholder="Boom lifts, forklifts...")

    # Grid Layout for Categories
    cols = st.columns(2)

    idx = 0
    for category, icon in EQUIPMENT_CATEGORIES.items():
        with cols[idx % 2]:
            st.write("")
            if st.button(f"{icon}\n{category}", key=category, use_container_width=True):
                st.session_state.selected_category = category
                navigate_to('equipment_list')
        idx += 1

    st.write("---")
    if st.button("← Home"):
        navigate_to('home')

# --- PAGE 3: EQUIPMENT LIST ---
def render_equipment_list():
    cat = st.session_state.selected_category
    st.subheader(f"{cat} Available")

    # Filter pill simulation
    st.markdown("`Height` `Fuel Type` `Manufacturer`")

    units = EQUIPMENT_DATABASE.get(cat, [])

    if not units:
        st.error("No units found in this category for your dates.")
        if st.button("← Back"):
            navigate_to('categories')
        return

    for unit in units:
        with st.container():
            c1, c2 = st.columns([1, 2])
            with c1:
                st.image(unit['image'], use_container_width=True)
            with c2:
                st.write(f"**{unit['name']}**")
                st.caption(f"{unit.get('height', unit.get('weight', 'Standard'))} | Diesel")
                st.write(f"🟢 **{3} Available**") # Mock live data
                st.markdown(f"**${unit['price_day']}** / day")

                if st.button("View Details ➜", key=f"btn_{unit['id']}"):
                    st.session_state.selected_unit = unit
                    navigate_to('pdp')
            st.divider()

    if st.button("← Categories"):
        navigate_to('categories')

# --- PAGE 4: PRODUCT DETAIL PAGE (PDP) ---
def render_pdp():
    unit = st.session_state.selected_unit
    st.subheader(unit['name'])

    st.image(unit['image'], use_container_width=True)

    # Tab layout for specs
    tab1, tab2 = st.tabs(["Specs", "Description"])

    with tab1:
        st.write(f"**Type:** {unit['type']}")
        st.write(f"**Capacity:** 500 lbs") # Mock
        st.write(f"**Power:** Diesel 4WD") # Mock

    with tab2:
        st.write("Ideal for outdoor construction and industrial applications. Features 4WD and rough terrain tires.")

    st.markdown("### Rates")
    c1, c2, c3 = st.columns(3)
    c1.metric("Daily", f"${unit['price_day']}")
    c2.metric("Weekly", f"${unit['price_week']}")
    c3.metric("Monthly", f"${unit['price_week']*3}") # Rough math

    st.success("✅ Available for your dates: Oct 12 - Oct 13")

    # Sticky-ish bottom interaction
    st.markdown("---")
    col_l, col_r = st.columns([1, 2])
    with col_l:
        st.caption("Est. Total")
        st.markdown(f"**${unit['price_day']}**")
    with col_r:
        if st.button("Add to Reservation", type="primary", use_container_width=True):
            st.session_state.cart = unit
            navigate_to('checkout')

    if st.button("← Back"):
        navigate_to('equipment_list')

# --- PAGE 5: CHECKOUT ---
def render_checkout():
    unit = st.session_state.cart
    st.subheader("Checkout")

    with st.expander("Order Summary", expanded=True):
        st.write(f"**Equipment:** {unit['name']}")
        st.write(f"**Dates:** {st.session_state.selected_dates[0]} - {st.session_state.selected_dates[1]}")
        st.write("**Location:** Skyworks Cartersville")
        st.divider()
        st.write(f"**Total:** ${unit['price_day'] * 1.08:.2f} (inc. tax)")

    st.markdown("#### Payment Options")
    payment_mode = st.radio("Select Payment Amount:", ["Pay Deposit (25%)", "Pay Full Amount"])

    amount_due = unit['price_day'] * 1.08
    if "25%" in payment_mode:
        amount_due = amount_due * 0.25

    st.metric("Amount Due Now", f"${amount_due:.2f}")

    st.text_input("Card Number", placeholder="**** **** **** 1234")

    if st.button(f"🔒 Pay ${amount_due:.2f} & Reserve", type="primary", use_container_width=True):
        st.balloons()
        st.success("Reservation Confirmed! Reference #8842-B")
        st.markdown("Data successfully pushed to **RentalMan ERP**.")
        if st.button("Back to Home"):
            st.session_state.cart = {}
            navigate_to('home')

    if st.button("← Cancel"):
        navigate_to('pdp')

# --- MAIN APP ROUTER ---
render_header() # This stays on top of every page

if st.session_state.page == 'home':
    render_home()
elif st.session_state.page == 'date_select':
    render_date_selection()
elif st.session_state.page == 'categories':
    render_categories()
elif st.session_state.page == 'equipment_list':
    render_equipment_list()
elif st.session_state.page == 'pdp':
    render_pdp()
elif st.session_state.page == 'checkout':
    render_checkout()
