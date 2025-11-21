#!/usr/bin/env python3
"""
Migration script to add user authentication to existing PKM PWA
This script:
1. Creates a default admin user 
2. Assigns all existing notes, notebooks, and push subscriptions to this user
3. Updates the database schema
"""

import os
import sys
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import engine, Base, User, Note, Notebook, PushSubscription as DBPushSubscription
from app.auth import get_password_hash

def create_session():
    """Create database session"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def run_migration():
    """Run the migration"""
    print("🚀 Starting migration to multi-user authentication...")
    
    db = create_session()
    
    try:
        # Step 1: Create all tables (this will add the User table and foreign key columns)
        print("📋 Creating/updating database schema...")
        Base.metadata.create_all(bind=engine)
        
        # Step 1.5: Add user_id columns to existing tables if they don't exist
        print("🔧 Adding user_id columns to existing tables...")
        try:
            # Add user_id to notes table
            db.execute(text("ALTER TABLE notes ADD COLUMN user_id INTEGER"))
            print("   - Added user_id column to notes table")
        except Exception:
            print("   - user_id column already exists in notes table")
        
        try:
            # Add user_id to notebooks table
            db.execute(text("ALTER TABLE notebooks ADD COLUMN user_id INTEGER"))
            print("   - Added user_id column to notebooks table")
        except Exception:
            print("   - user_id column already exists in notebooks table")
        
        try:
            # Add user_id to push_subscriptions table
            db.execute(text("ALTER TABLE push_subscriptions ADD COLUMN user_id INTEGER"))
            print("   - Added user_id column to push_subscriptions table")
        except Exception:
            print("   - user_id column already exists in push_subscriptions table")
        
        db.commit()
        
        # Step 2: Create default admin user
        print("👤 Creating default admin user...")
        
        admin_email = "admin@localhost.com"
        admin_password = "admin123"  # Simple password as requested
        
        # Ensure password is within bcrypt limit
        if len(admin_password.encode('utf-8')) > 72:
            admin_password = admin_password[:72]
        
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_admin:
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                first_name="Admin",
                last_name="User",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            admin_id = admin_user.id
            print(f"✅ Created admin user: {admin_email} (password: {admin_password})")
        else:
            admin_id = existing_admin.id
            print(f"✅ Admin user already exists: {admin_email}")
        
        # Step 3: Count existing data
        notes_count = db.query(Note).filter(Note.user_id.is_(None)).count()
        notebooks_count = db.query(Notebook).filter(Notebook.user_id.is_(None)).count()
        subscriptions_count = db.query(DBPushSubscription).filter(DBPushSubscription.user_id.is_(None)).count()
        
        print(f"📊 Found existing data:")
        print(f"   - Notes without user: {notes_count}")
        print(f"   - Notebooks without user: {notebooks_count}")
        print(f"   - Push subscriptions without user: {subscriptions_count}")
        
        # Step 4: Assign existing notes to admin user
        if notes_count > 0:
            print("📝 Assigning existing notes to admin user...")
            db.execute(
                text("UPDATE notes SET user_id = :admin_id WHERE user_id IS NULL"),
                {"admin_id": admin_id}
            )
            print(f"✅ Assigned {notes_count} notes to admin user")
        
        # Step 5: Assign existing notebooks to admin user
        if notebooks_count > 0:
            print("📚 Assigning existing notebooks to admin user...")
            db.execute(
                text("UPDATE notebooks SET user_id = :admin_id WHERE user_id IS NULL"),
                {"admin_id": admin_id}
            )
            print(f"✅ Assigned {notebooks_count} notebooks to admin user")
        
        # Step 6: Assign existing push subscriptions to admin user
        if subscriptions_count > 0:
            print("🔔 Assigning existing push subscriptions to admin user...")
            db.execute(
                text("UPDATE push_subscriptions SET user_id = :admin_id WHERE user_id IS NULL"),
                {"admin_id": admin_id}
            )
            print(f"✅ Assigned {subscriptions_count} push subscriptions to admin user")
        
        # Commit all changes
        db.commit()
        
        # Step 7: Verify migration
        print("\n🔍 Verifying migration...")
        
        total_notes = db.query(Note).count()
        total_notebooks = db.query(Notebook).count()
        total_subscriptions = db.query(DBPushSubscription).count()
        
        admin_notes = db.query(Note).filter(Note.user_id == admin_id).count()
        admin_notebooks = db.query(Notebook).filter(Notebook.user_id == admin_id).count()
        admin_subscriptions = db.query(DBPushSubscription).filter(DBPushSubscription.user_id == admin_id).count()
        
        print(f"📊 Post-migration summary:")
        print(f"   - Total notes: {total_notes} (admin owns: {admin_notes})")
        print(f"   - Total notebooks: {total_notebooks} (admin owns: {admin_notebooks})")
        print(f"   - Total subscriptions: {total_subscriptions} (admin owns: {admin_subscriptions})")
        
        if total_notes == admin_notes and total_notebooks == admin_notebooks and total_subscriptions == admin_subscriptions:
            print("✅ Migration completed successfully!")
            print(f"\n🎉 You can now login with:")
            print(f"   Email: {admin_email}")
            print(f"   Password: {admin_password}")
            print(f"\n💡 All existing data is preserved and accessible through the admin account.")
        else:
            print("⚠️  Migration completed but some data may not have been assigned correctly.")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()