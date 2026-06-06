#!/bin/bash

echo "=========================================="
echo "DIGITALROHTAK PROPERTY PORTAL - SYSTEM CHECK"
echo "=========================================="
echo ""

echo "1. DATABASE RECORDS FOR 917027293964"
echo "--------------------------------------"
sudo mysql -e "USE sadahaq_own_ui_db; 
SELECT 'sadahaq_user_sessions' as table_name, COUNT(*) as count FROM sadahaq_user_sessions WHERE mobile LIKE '%917027293964%'
UNION ALL
SELECT 'sadahaq_property_listings', COUNT(*) FROM sadahaq_property_listings WHERE mobile LIKE '%917027293964%'
UNION ALL
SELECT 'otp_verifications', COUNT(*) FROM otp_verifications;"
echo ""

echo "2. ALL USER SESSIONS"
echo "--------------------------------------"
sudo mysql -e "USE sadahaq_own_ui_db; SELECT id, mobile, pin, intent, role, email, created_at FROM sadahaq_user_sessions ORDER BY created_at DESC;"
echo ""

echo "3. MEGA MENU COMPONENTS"
echo "--------------------------------------"
echo "BuyMegaMenu exists:"
grep -c "function BuyMegaMenu" /home/sadahaqtrust/sadahaq-property-service/ui/src/App.jsx
echo "RentMegaMenu exists:"
grep -c "function RentMegaMenu" /home/sadahaqtrust/sadahaq-property-service/ui/src/App.jsx
echo "Mega menu usage in navigation:"
grep -c "activeMenu === 'buy'" /home/sadahaqtrust/sadahaq-property-service/ui/src/App.jsx
echo ""

echo "4. MEGA MENU CSS"
echo "--------------------------------------"
grep -c "\.mega-menu" /home/sadahaqtrust/sadahaq-property-service/ui/src/index.css
echo "mega-menu classes found in CSS"
echo ""

echo "5. API SERVICE STATUS"
echo "--------------------------------------"
sudo systemctl status property-api.service --no-pager | head -10
echo ""

echo "6. LATEST BUILD INFO"
echo "--------------------------------------"
ls -lh /home/sadahaqtrust/sadahaq-property-service/ui/dist/assets/*.js 2>/dev/null | tail -1
ls -lh /home/sadahaqtrust/sadahaq-property-service/ui/dist/assets/*.css 2>/dev/null | tail -1
echo ""

echo "7. NGINX CONFIGURATION"
echo "--------------------------------------"
grep -A 5 "server_name property.digitalrohtak.online" /etc/nginx/sites-enabled/digitalrohtak-subdomains.conf
echo ""

echo "8. DATABASE TABLE STRUCTURE"
echo "--------------------------------------"
sudo mysql -e "USE sadahaq_own_ui_db; DESCRIBE sadahaq_user_sessions;"
echo ""

echo "9. AUTHENTICATION FLOW CHECK"
echo "--------------------------------------"
echo "New user flow (step 6 for roles):"
grep -n "setStep(6)" /home/sadahaqtrust/sadahaq-property-service/ui/src/App.jsx | grep "new_user"
echo ""
echo "Save session with 'new' intent:"
grep -n "intent: 'new'" /home/sadahaqtrust/sadahaq-property-service/ui/src/App.jsx
echo ""

echo "10. BACKEND SAVE-SESSION LOGIC"
echo "--------------------------------------"
grep -A 5 "if intent in \['new', 'reset'\]:" /home/sadahaqtrust/sadahaq-property-service/api/main.py
echo ""

echo "=========================================="
echo "SYSTEM CHECK COMPLETE"
echo "=========================================="
