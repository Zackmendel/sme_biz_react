"""initial accounting schema

Revision ID: a6471baebfe9
Revises: 
Create Date: 2026-07-13 12:23:46.997507

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a6471baebfe9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create pg_trgm extension
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # 2. Create tables
    op.create_table('businesses',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('owner_name', sa.String(), nullable=True),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('industry', sa.Enum('retail', 'food_services', 'services', 'distributors', 'IT', name='business_industry'), nullable=False),
    sa.Column('scale', sa.Enum('sole_trader', 'micro', 'small', 'medium', name='business_scale'), nullable=False),
    sa.Column('phone', sa.String(), nullable=True),
    sa.Column('email', sa.String(), nullable=True),
    sa.Column('city', sa.Enum('Minna', 'Suleja', 'Bida', 'Kontagora', 'Lapai', 'Mokwa', 'New Bussa', 'Agaie', 'Paiko', 'Kagara', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu', 'Kaduna', 'Jos', 'Ilorin', name='nigeria_city_list'), nullable=False),
    sa.Column('address', sa.String(), nullable=True),
    sa.Column('proof_url', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('accounting_cycles',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('period_type', sa.Enum('daily', 'weekly', 'monthly', 'quarterly', 'yearly', name='period_enum'), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=False),
    sa.Column('balance_brought_forward', sa.Numeric(precision=14, scale=2), server_default=sa.text('0'), nullable=False),
    sa.Column('debts_accrued', sa.Numeric(precision=14, scale=2), server_default=sa.text('0'), nullable=False),
    sa.Column('is_closed', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('daily_summaries',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('summary_date', sa.Date(), nullable=False),
    sa.Column('total_sales', sa.Numeric(precision=14, scale=2), server_default=sa.text('0'), nullable=False),
    sa.Column('total_purchases', sa.Numeric(precision=14, scale=2), server_default=sa.text('0'), nullable=False),
    sa.Column('net', sa.Numeric(precision=14, scale=2), server_default=sa.text('0'), nullable=False),
    sa.Column('transaction_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('unique_customers', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('top_item', sa.String(), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('business_id', 'summary_date', name='daily_summaries_business_id_summary_date_key')
    )
    op.create_table('debtors',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('customer_name', sa.String(), nullable=False),
    sa.Column('amount', sa.BigInteger(), nullable=False),
    sa.Column('is_paid', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('products',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('default_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('unit', sa.String(), nullable=True),
    sa.Column('category', sa.String(), nullable=True),
    sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=True),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('first_name', sa.String(), nullable=True),
    sa.Column('last_name', sa.String(), nullable=True),
    sa.Column('role', sa.Enum('owner', 'admin', 'staff', 'viewer', name='role_enum'), server_default=sa.text("'viewer'"), nullable=False),
    sa.Column('status', sa.Enum('permanent', 'part_time', 'intern', 'contract', name='status_enum'), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['id'], ['auth.users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('audit_trail',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('table_name', sa.String(), nullable=False),
    sa.Column('record_id', sa.UUID(), nullable=False),
    sa.Column('action', sa.String(), nullable=False),
    sa.Column('before_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('after_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('purchases',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('cycle_id', sa.UUID(), nullable=False),
    sa.Column('product_id', sa.UUID(), nullable=True),
    sa.Column('item_name', sa.String(), nullable=False),
    sa.Column('vendor_details', sa.String(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('price_per_unit', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('is_flagged', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['cycle_id'], ['accounting_cycles.id'], ),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sales',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('cycle_id', sa.UUID(), nullable=False),
    sa.Column('product_id', sa.UUID(), nullable=True),
    sa.Column('item_name', sa.String(), nullable=False),
    sa.Column('customer_details', sa.String(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('price_per_unit', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('discount', sa.Numeric(precision=12, scale=2), server_default=sa.text('0'), nullable=False),
    sa.Column('total', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('payment_type', sa.Enum('cash', 'transfer', 'card', 'credit', name='payment_type'), server_default=sa.text("'cash'"), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('is_flagged', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['cycle_id'], ['accounting_cycles.id'], ),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # 3. Create indexes
    op.create_index('idx_businesses_name', 'businesses', [sa.text('name gin_trgm_ops')], postgresql_using='gin')
    op.create_index('idx_businesses_city_industry', 'businesses', ['city', 'industry'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_status', 'users', ['status'])
    op.create_index('idx_users_business_id', 'users', ['business_id'])
    op.create_index('idx_products_business_id', 'products', ['business_id'])
    op.create_index('idx_accounting_cycles_business_id', 'accounting_cycles', ['business_id'])
    op.create_index('idx_accounting_cycles_open_period', 'accounting_cycles', ['business_id', 'period_type'], unique=True, postgresql_where=sa.text('NOT is_closed'))
    op.create_index('idx_sales_business_id_created_at', 'sales', ['business_id', 'created_at'])
    op.create_index('idx_sales_cycle_id', 'sales', ['cycle_id'])
    op.create_index('idx_purchases_business_id_created_at', 'purchases', ['business_id', 'created_at'])
    op.create_index('idx_purchases_cycle_id', 'purchases', ['cycle_id'])
    op.create_index('idx_debtors_business_id', 'debtors', ['business_id'])
    op.create_index('idx_daily_summaries_business_id_date', 'daily_summaries', ['business_id', 'summary_date'])
    op.create_index('idx_audit_trail_business_id_changed_at', 'audit_trail', ['business_id', 'changed_at'])
    op.create_index('idx_audit_trail_table_record', 'audit_trail', ['table_name', 'record_id'])

    # 4. Enable Row-Level Security (RLS)
    tables = [
        'businesses', 'users', 'products', 'accounting_cycles',
        'sales', 'purchases', 'debtors', 'daily_summaries', 'audit_trail'
    ]
    for t in tables:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;")

    # 5. RLS Policies
    op.execute("""
        CREATE POLICY business_select_policy ON businesses FOR SELECT TO authenticated
        USING (id = (SELECT business_id FROM users WHERE id = auth.uid()));
    """)
    op.execute("""
        CREATE POLICY business_insert_policy ON businesses FOR INSERT TO authenticated
        WITH CHECK (true);
    """)
    op.execute("""
        CREATE POLICY business_update_policy ON businesses FOR UPDATE TO authenticated
        USING (id = (SELECT business_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));
    """)
    op.execute("""
        CREATE POLICY business_delete_policy ON businesses FOR DELETE TO authenticated
        USING (id = (SELECT business_id FROM users WHERE id = auth.uid() AND role = 'owner'));
    """)

    op.execute("""
        CREATE POLICY user_select_policy ON users FOR SELECT TO authenticated
        USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()) OR id = auth.uid());
    """)
    op.execute("""
        CREATE POLICY user_update_policy ON users FOR UPDATE TO authenticated
        USING (id = auth.uid() OR (business_id = (SELECT business_id FROM users WHERE id = auth.uid()) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin')));
    """)

    scoped_tables = ['products', 'accounting_cycles', 'sales', 'purchases', 'debtors', 'daily_summaries']
    for t in scoped_tables:
        op.execute(f"""
            CREATE POLICY {t}_select_policy ON {t} FOR SELECT TO authenticated
            USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
        """)
        op.execute(f"""
            CREATE POLICY {t}_insert_policy ON {t} FOR INSERT TO authenticated
            WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin', 'staff'));
        """)
        op.execute(f"""
            CREATE POLICY {t}_update_policy ON {t} FOR UPDATE TO authenticated
            USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin'));
        """)
        op.execute(f"""
            CREATE POLICY {t}_delete_policy ON {t} FOR DELETE TO authenticated
            USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin'));
        """)

    op.execute("""
        CREATE POLICY audit_trail_select_policy ON audit_trail FOR SELECT TO authenticated
        USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
    """)
    op.execute("""
        CREATE POLICY audit_trail_insert_policy ON audit_trail FOR INSERT TO authenticated
        WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
    """)

    # 6. Auth trigger integration
    op.execute("""
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $$
        BEGIN
          INSERT INTO public.users (id, email, role, is_active)
          VALUES (new.id, new.email, 'viewer', true);
          RETURN new;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)
    op.execute("""
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    """)

    # 7. Total calculations triggers
    op.execute("""
        CREATE OR REPLACE FUNCTION calculate_sale_total()
        RETURNS trigger AS $$
        BEGIN
          NEW.total := (NEW.quantity * NEW.price_per_unit) - NEW.discount;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_calculate_sale_total
        BEFORE INSERT OR UPDATE ON sales
        FOR EACH ROW EXECUTE FUNCTION calculate_sale_total();
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION calculate_purchase_total()
        RETURNS trigger AS $$
        BEGIN
          NEW.total := NEW.quantity * NEW.price_per_unit;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_calculate_purchase_total
        BEFORE INSERT OR UPDATE ON purchases
        FOR EACH ROW EXECUTE FUNCTION calculate_purchase_total();
    """)

    # 8. Daily summaries trigger
    op.execute("""
        CREATE OR REPLACE FUNCTION refresh_daily_summary()
        RETURNS trigger AS $$
        DECLARE
          v_business_id uuid;
          v_date date;
          v_sales numeric(14,2);
          v_purchases numeric(14,2);
          v_tx_count integer;
          v_unique_cust integer;
          v_top_item text;
        BEGIN
          IF TG_OP = 'DELETE' THEN
            v_business_id := OLD.business_id;
            v_date := OLD.created_at::date;
          ELSE
            v_business_id := NEW.business_id;
            v_date := NEW.created_at::date;
          END IF;

          SELECT COALESCE(SUM(total), 0) INTO v_sales
          FROM sales
          WHERE business_id = v_business_id AND created_at::date = v_date;

          SELECT COALESCE(SUM(total), 0) INTO v_purchases
          FROM purchases
          WHERE business_id = v_business_id AND created_at::date = v_date;

          SELECT (
            (SELECT COUNT(*) FROM sales WHERE business_id = v_business_id AND created_at::date = v_date) +
            (SELECT COUNT(*) FROM purchases WHERE business_id = v_business_id AND created_at::date = v_date)
          ) INTO v_tx_count;

          SELECT COUNT(DISTINCT customer_details) INTO v_unique_cust
          FROM sales
          WHERE business_id = v_business_id AND created_at::date = v_date AND customer_details IS NOT NULL;

          SELECT item_name INTO v_top_item
          FROM (
            SELECT item_name, SUM(quantity) as total_qty
            FROM sales
            WHERE business_id = v_business_id AND created_at::date = v_date
            GROUP BY item_name
            ORDER BY total_qty DESC, item_name ASC
            LIMIT 1
          ) t;

          INSERT INTO daily_summaries (business_id, summary_date, total_sales, total_purchases, net, transaction_count, unique_customers, top_item, updated_at)
          VALUES (v_business_id, v_date, v_sales, v_purchases, v_sales - v_purchases, v_tx_count, v_unique_cust, v_top_item, now())
          ON CONFLICT (business_id, summary_date) DO UPDATE
          SET total_sales = EXCLUDED.total_sales,
              total_purchases = EXCLUDED.total_purchases,
              net = EXCLUDED.net,
              transaction_count = EXCLUDED.transaction_count,
              unique_customers = EXCLUDED.unique_customers,
              top_item = EXCLUDED.top_item,
              updated_at = now();

          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_sales_daily_summary
        AFTER INSERT OR UPDATE OR DELETE ON sales
        FOR EACH ROW EXECUTE FUNCTION refresh_daily_summary();
    """)
    op.execute("""
        CREATE TRIGGER trg_purchases_daily_summary
        AFTER INSERT OR UPDATE OR DELETE ON purchases
        FOR EACH ROW EXECUTE FUNCTION refresh_daily_summary();
    """)

    # 9. Audit Trail trigger
    op.execute("""
        CREATE OR REPLACE FUNCTION process_audit_log()
        RETURNS trigger AS $$
        DECLARE
          v_business_id uuid;
          v_user_id uuid;
          v_record_id uuid;
          v_before jsonb := null;
          v_after jsonb := null;
        BEGIN
          BEGIN
            v_user_id := auth.uid();
          EXCEPTION WHEN OTHERS THEN
            v_user_id := null;
          END;

          IF TG_OP = 'DELETE' THEN
            v_record_id := OLD.id;
            v_business_id := OLD.business_id;
            v_before := to_jsonb(OLD);
          ELSIF TG_OP = 'UPDATE' THEN
            v_record_id := NEW.id;
            v_business_id := NEW.business_id;
            v_before := to_jsonb(OLD);
            v_after := to_jsonb(NEW);
          ELSE
            v_record_id := NEW.id;
            IF TG_TABLE_NAME = 'businesses' THEN
              v_business_id := NEW.id;
            ELSE
              v_business_id := NEW.business_id;
            END IF;
            v_after := to_jsonb(NEW);
          END IF;

          IF v_business_id IS NOT NULL THEN
            INSERT INTO audit_trail (business_id, user_id, table_name, record_id, action, before_value, after_value, changed_at)
            VALUES (v_business_id, v_user_id, TG_TABLE_NAME, v_record_id, TG_OP, v_before, v_after, now());
          END IF;

          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)
    for t in ['businesses', 'users', 'products', 'accounting_cycles', 'sales', 'purchases']:
        op.execute(f"""
            CREATE TRIGGER trg_audit_{t}
            AFTER INSERT OR UPDATE OR DELETE ON {t}
            FOR EACH ROW EXECUTE FUNCTION process_audit_log();
        """)


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Drop audit triggers
    for t in ['businesses', 'users', 'products', 'accounting_cycles', 'sales', 'purchases']:
        op.execute(f"DROP TRIGGER IF EXISTS trg_audit_{t} ON {t};")
    op.execute("DROP FUNCTION IF EXISTS process_audit_log();")

    # 2. Drop daily summary triggers
    op.execute("DROP TRIGGER IF EXISTS trg_sales_daily_summary ON sales;")
    op.execute("DROP TRIGGER IF EXISTS trg_purchases_daily_summary ON purchases;")
    op.execute("DROP FUNCTION IF EXISTS refresh_daily_summary();")

    # 3. Drop total calculation triggers
    op.execute("DROP TRIGGER IF EXISTS trg_calculate_sale_total ON sales;")
    op.execute("DROP FUNCTION IF EXISTS calculate_sale_total();")
    op.execute("DROP TRIGGER IF EXISTS trg_calculate_purchase_total ON purchases;")
    op.execute("DROP FUNCTION IF EXISTS calculate_purchase_total();")

    # 4. Drop auth triggers
    op.execute("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;")
    op.execute("DROP FUNCTION IF EXISTS public.handle_new_user();")

    # 5. Drop tables
    op.drop_table('sales')
    op.drop_table('purchases')
    op.drop_table('audit_trail')
    op.drop_table('users')
    op.drop_table('products')
    op.drop_table('debtors')
    op.drop_table('daily_summaries')
    op.drop_table('accounting_cycles')
    op.drop_table('businesses')

    # 6. Drop enums
    op.execute("DROP TYPE IF EXISTS payment_type;")
    op.execute("DROP TYPE IF EXISTS status_enum;")
    op.execute("DROP TYPE IF EXISTS role_enum;")
    op.execute("DROP TYPE IF EXISTS period_enum;")
    op.execute("DROP TYPE IF EXISTS business_scale;")
    op.execute("DROP TYPE IF EXISTS business_industry;")
    op.execute("DROP TYPE IF EXISTS nigeria_city_list;")
