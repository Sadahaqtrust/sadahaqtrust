from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import mysql.connector
from typing import Optional
import os, uuid, shutil, random, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = FastAPI(title="Sadahaq Property Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/home/sadahaqtrust/sadahaq-property-service/uploads/tax_bills"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/home/sadahaqtrust/sadahaq-property-service/uploads"), name="uploads")

def get_db():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="digitaladmin",
        password="Saanvi02052016@",
        database="sadahaq_own_ui_db"
    )

TABLE = "sadahaq_haryana_property_rohtak"

GMAIL_USER = "sadahaqtrust@gmail.com"
GMAIL_APP_PASSWORD = "sogw wtqv dafv kfsd"

def send_otp_email(email: str, otp: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = email
        msg['Subject'] = 'Your DigitalRohtak OTP'
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="background: #FF9933; padding: 20px; border-radius: 10px; color: white; text-align: center;">
                <h2>🏠 DigitalRohtak</h2>
                <p>Your OTP for registration</p>
            </div>
            <div style="padding: 30px; text-align: center;">
                <h1 style="color: #008000; font-size: 48px; letter-spacing: 8px;">{otp}</h1>
                <p style="color: #666; margin-top: 20px;">This OTP is valid for 10 minutes.</p>
                <p style="color: #666;">Do not share this OTP with anyone.</p>
            </div>
            <div style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
                <p>© Sadahaq International | Managed by Sadahaq Trust</p>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD.replace(' ', ''))
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

@app.post("/api/send-otp")
def send_otp(body: dict):
    email = body.get("email", "").strip().lower()
    if not email or '@' not in email:
        return {"success": False, "error": "Invalid email"}
    
    otp = str(random.randint(1000, 9999))
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO otp_verifications (email, otp, created_at) VALUES (%s, %s, NOW()) ON DUPLICATE KEY UPDATE otp = %s, created_at = NOW()",
        [email, otp, otp]
    )
    db.commit()
    cursor.close()
    db.close()
    
    if send_otp_email(email, otp):
        return {"success": True, "message": "OTP sent to email"}
    else:
        return {"success": False, "error": "Failed to send email"}

@app.post("/api/verify-otp")
def verify_otp(body: dict):
    email = body.get("email", "").strip().lower()
    otp = body.get("otp", "").strip()
    
    if not email or not otp:
        return {"success": False, "error": "Email and OTP required"}
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM otp_verifications WHERE email = %s AND otp = %s AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)",
        [email, otp]
    )
    result = cursor.fetchone()
    
    if result:
        cursor.execute("DELETE FROM otp_verifications WHERE email = %s", [email])
        db.commit()
        cursor.close()
        db.close()
        return {"success": True, "verified": True}
    else:
        cursor.close()
        db.close()
        return {"success": False, "verified": False, "error": "Invalid or expired OTP"}

@app.post("/api/verify-pin")
def verify_pin(body: dict):
    mobile = body.get("mobile", "")
    pin = body.get("pin", "")
    
    if not mobile or not pin:
        return {"success": False, "error": "Mobile and PIN required"}
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM sadahaq_user_sessions WHERE mobile = %s AND pin = %s ORDER BY created_at DESC LIMIT 1", [mobile, pin])
    user = cursor.fetchone()
    
    if user:
        cursor.close()
        db.close()
        return {"success": True, "user": user}
    else:
        cursor.execute("SELECT * FROM sadahaq_user_sessions WHERE mobile = %s ORDER BY created_at DESC LIMIT 1", [mobile])
        existing = cursor.fetchone()
        cursor.close()
        db.close()
        
        if existing and existing.get('pin'):
            return {"success": False, "error": "Invalid PIN"}
        else:
            return {"success": False, "new_user": True}

@app.post("/api/register-mobile")
def register_mobile(body: dict):
    mobile = body.get("mobile", "")
    if not mobile:
        return {"success": False}
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM sadahaq_user_sessions WHERE mobile = %s ORDER BY created_at DESC LIMIT 1", [mobile])
    existing = cursor.fetchone()
    cursor.close(); db.close()
    return {"success": True, "existing": existing}

@app.post("/api/save-session")
def save_session(body: dict):
    mobile = body.get("mobile", "")
    pid = body.get("pid", "")
    intent = body.get("intent", "")
    role = body.get("role", "")
    email = body.get("email", "")
    pin = body.get("pin", "")
    if not mobile:
        return {"success": False}
    
    db = get_db()
    cursor = db.cursor()
    
    # Handle PIN reset or new user PIN save (temporary intent/role)
    if intent in ['new', 'reset']:
        cursor.execute("""
            INSERT INTO sadahaq_user_sessions (mobile, pin, email, pid, intent, role) 
            VALUES (%s, %s, %s, '', '', '')
            ON DUPLICATE KEY UPDATE 
                pin = VALUES(pin),
                email = VALUES(email)
        """, [mobile, pin, email])
        db.commit()
        cursor.close()
        db.close()
        return {"success": True}
    
    # Normal session save with proper intent and roles
    if not intent or not role:
        cursor.close()
        db.close()
        return {"success": False}
    
    cursor.execute("""
        INSERT INTO sadahaq_user_sessions (mobile, pid, intent, role, email, pin) 
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            pid = VALUES(pid),
            intent = VALUES(intent),
            role = VALUES(role),
            email = VALUES(email),
            pin = VALUES(pin)
    """, [mobile, pid, intent, role, email, pin])
    db.commit()
    cursor.close(); db.close()
    return {"success": True}

@app.post("/api/verify-property")
def verify_property(body: dict):
    pid = (body.get("pid") or "").strip().lower()
    owner = (body.get("owner_name") or "").strip().lower()
    colony = (body.get("colony") or "").strip().lower()
    address = (body.get("address") or "").strip().lower()

    db = get_db()
    cursor = db.cursor(dictionary=True)
    matches = []
    score = 0

    if pid:
        cursor.execute(f"SELECT * FROM {TABLE} WHERE LOWER(pid) = %s LIMIT 1", [pid])
        row = cursor.fetchone()
        if row:
            matches.append(row)
            score += 1
            if owner and owner not in ["na", "n/a", ""] and owner in (row["owner_name"] or "").lower():
                score += 1
            if colony and colony in (row["colony"] or "").lower():
                score += 1
            if address and address[:10] in (row["address"] or "").lower():
                score += 1
    else:
        conditions, params = [], []
        if colony:
            conditions.append("LOWER(colony) LIKE %s"); params.append(f"%{colony}%")
        if address:
            conditions.append("LOWER(address) LIKE %s"); params.append(f"%{address[:20]}%")
        if owner and owner not in ["na", "n/a"]:
            conditions.append("LOWER(owner_name) LIKE %s"); params.append(f"%{owner}%")
        if conditions:
            cursor.execute(f"SELECT * FROM {TABLE} WHERE {' AND '.join(conditions)} LIMIT 5", params)
            matches = cursor.fetchall()
            score = len(matches)

    cursor.close(); db.close()
    if score >= 2 or (pid and matches):
        return {"verified": True, "score": score, "record": matches[0] if matches else None}
    return {"verified": False, "score": score, "record": None}

@app.get("/api/colonies")
def get_colonies():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(f"SELECT DISTINCT colony FROM {TABLE} WHERE colony IS NOT NULL ORDER BY colony")
    colonies = [r["colony"] for r in cursor.fetchall()]
    cursor.close(); db.close()
    return {"colonies": colonies}

@app.post("/api/upload-tax-bill")
async def upload_tax_bill(file: UploadFile = File(...), mobile: str = Form(...), pid: str = Form(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
        return {"success": False, "error": "Only PDF, JPG, PNG allowed"}
    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"success": True, "path": f"/uploads/tax_bills/{fname}", "filename": fname}

@app.post("/api/add-listing")
async def add_listing(
    pid: str = Form(...),
    mobile: str = Form(...),
    listing_type: str = Form(...),
    description: str = Form(""),
    images: list[UploadFile] = File(None),
    tax_bills: list[UploadFile] = File(None),
    deed: list[UploadFile] = File(None),
    rental_agreement: list[UploadFile] = File(None)
):
    pid = pid.strip().lower()
    if not pid or not mobile or not listing_type:
        return {"success": False, "error": "Missing required fields"}
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(f"SELECT * FROM {TABLE} WHERE LOWER(pid) = %s LIMIT 1", [pid])
    prop = cursor.fetchone()
    if not prop:
        cursor.close(); db.close()
        return {"success": False, "error": "Property not found in registry"}
    
    cursor.execute(
        "SELECT id FROM sadahaq_property_listings WHERE pid = %s AND listing_type = %s AND is_active = 1",
        [prop["pid"], listing_type]
    )
    if cursor.fetchone():
        cursor.close(); db.close()
        return {"success": False, "error": "Already listed"}
    
    image_paths = []
    tax_bill_paths = []
    deed_paths = []
    rental_agreement_paths = []
    
    if images:
        for img in images:
            ext = os.path.splitext(img.filename)[1].lower()
            fname = f"{uuid.uuid4().hex}{ext}"
            fpath = os.path.join(UPLOAD_DIR, fname)
            with open(fpath, "wb") as f:
                shutil.copyfileobj(img.file, f)
            image_paths.append(f"/uploads/tax_bills/{fname}")
    
    if tax_bills:
        for doc in tax_bills:
            ext = os.path.splitext(doc.filename)[1].lower()
            fname = f"{uuid.uuid4().hex}{ext}"
            fpath = os.path.join(UPLOAD_DIR, fname)
            with open(fpath, "wb") as f:
                shutil.copyfileobj(doc.file, f)
            tax_bill_paths.append(f"/uploads/tax_bills/{fname}")
    
    if deed:
        for doc in deed:
            ext = os.path.splitext(doc.filename)[1].lower()
            fname = f"{uuid.uuid4().hex}{ext}"
            fpath = os.path.join(UPLOAD_DIR, fname)
            with open(fpath, "wb") as f:
                shutil.copyfileobj(doc.file, f)
            deed_paths.append(f"/uploads/tax_bills/{fname}")
    
    if rental_agreement:
        for doc in rental_agreement:
            ext = os.path.splitext(doc.filename)[1].lower()
            fname = f"{uuid.uuid4().hex}{ext}"
            fpath = os.path.join(UPLOAD_DIR, fname)
            with open(fpath, "wb") as f:
                shutil.copyfileobj(doc.file, f)
            rental_agreement_paths.append(f"/uploads/tax_bills/{fname}")
    
    bill_verified = 1 if tax_bill_paths else 0
    cursor.execute("""
        INSERT INTO sadahaq_property_listings
        (pid, mobile, listing_type, owner_name, colony, address, property_type,
         plot_area_sq_yard, plot_area_sq_meter, image_url, details_url,
         tax_bill_path, bill_verified, description, images, deed_docs, rental_agreement_docs)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, [prop["pid"], mobile, listing_type, prop["owner_name"], prop["colony"],
          prop["address"], prop["property_type"], prop["plot_area_sq_yard"],
          prop["plot_area_sq_meter"], prop["image_url"], prop["details_url"],
          ','.join(tax_bill_paths) if tax_bill_paths else None, bill_verified, description,
          ','.join(image_paths) if image_paths else None,
          ','.join(deed_paths) if deed_paths else None,
          ','.join(rental_agreement_paths) if rental_agreement_paths else None])
    db.commit()
    cursor.close(); db.close()
    return {"success": True, "property": prop}

@app.get("/api/listings")
def get_listings(
    listing_type: str = "sale",
    search: Optional[str] = None,
    colony: Optional[str] = None,
    pid: Optional[str] = None,
    owner: Optional[str] = None,
    address: Optional[str] = None,
    mobile: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    offset = (page - 1) * limit
    where = "WHERE is_active = 1"
    params = []
    
    if mobile:
        where += " AND mobile = %s"
        params.append(mobile)
    else:
        where += " AND listing_type = %s"
        params.append(listing_type)
    
    if pid:
        where += " AND LOWER(pid) LIKE %s"; params.append(f"%{pid.lower()}%")
    if colony:
        where += " AND LOWER(colony) LIKE %s"; params.append(f"%{colony.lower()}%")
    if owner:
        where += " AND LOWER(owner_name) LIKE %s"; params.append(f"%{owner.lower()}%")
    if address:
        where += " AND LOWER(address) LIKE %s"; params.append(f"%{address.lower()}%")
    if search:
        where += " AND (LOWER(owner_name) LIKE %s OR LOWER(address) LIKE %s OR LOWER(colony) LIKE %s OR LOWER(pid) LIKE %s)"
        params += [f"%{search.lower()}%"] * 4
    cursor.execute(f"SELECT COUNT(*) as total FROM sadahaq_property_listings {where}", params)
    total = cursor.fetchone()["total"]
    cursor.execute(f"SELECT * FROM sadahaq_property_listings {where} ORDER BY bill_verified DESC, created_at DESC LIMIT %s OFFSET %s", params + [limit, offset])
    data = cursor.fetchall()
    cursor.close(); db.close()
    return {"total": total, "page": page, "data": data}

@app.get("/api/properties")
def get_properties(
    page: int = 1, limit: int = 20,
    search: Optional[str] = None,
    ulb: Optional[str] = None,
    property_type: Optional[str] = None
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    offset = (page - 1) * limit
    where = "WHERE 1=1"
    params = []
    if search:
        where += " AND (owner_name LIKE %s OR pid LIKE %s OR address LIKE %s OR colony LIKE %s)"
        params += [f"%{search}%"] * 4
    if ulb:
        where += " AND ulb = %s"; params.append(ulb)
    if property_type:
        where += " AND property_type = %s"; params.append(property_type)
    cursor.execute(f"SELECT COUNT(*) as total FROM {TABLE} {where}", params)
    total = cursor.fetchone()["total"]
    cursor.execute(f"SELECT * FROM {TABLE} {where} LIMIT %s OFFSET %s", params + [limit, offset])
    data = cursor.fetchall()
    cursor.close(); db.close()
    return {"total": total, "page": page, "limit": limit, "data": data}
