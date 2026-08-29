CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL  -- 'customer', 'admin'
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id) DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 0,
    image_url TEXT,
    brand_id INT REFERENCES brands(id),
    category_id INT REFERENCES categories(id),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    product_id INTEGER NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    product_id INTEGER NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    quantity INTEGER DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    full_name VARCHAR(255) NOT NULL,

    phone VARCHAR(20),

    address_line1 TEXT NOT NULL,

    address_line2 TEXT,

    city VARCHAR(100),

    state VARCHAR(100),

    pincode VARCHAR(20),

    country VARCHAR(100) DEFAULT 'India',

    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    address_id INTEGER
        REFERENCES addresses(id),

    total_amount DECIMAL(10,2),

    status VARCHAR(50) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,

    order_id INTEGER NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,

    product_id INTEGER NOT NULL
        REFERENCES products(id),

    quantity INTEGER NOT NULL,

    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    product_id INTEGER NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    rating INTEGER CHECK (
        rating >= 1
        AND rating <= 5
    ),

    review TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,

    user_id INTEGER
        REFERENCES users(id),

    product_id INTEGER
        REFERENCES products(id),

    activity_type VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New tables for internal (staff) accounts
CREATE TABLE internal_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE
);

INSERT INTO internal_roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;
INSERT INTO internal_roles (name) VALUES ('marketing_manager') ON CONFLICT (name) DO NOTHING;

CREATE TABLE internal_users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    role_id INTEGER NOT NULL REFERENCES internal_roles(id),
    created_at TIMESTAMP DEFAULT now()
);

-- Move admin/marketing_manager rows out of users
INSERT INTO internal_users (full_name, email, password_hash, role_id, created_at)
SELECT u.full_name, u.email, u.password_hash, ir.id, u.created_at
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN internal_roles ir ON ir.name = r.name
WHERE r.name IN ('admin', 'marketing_manager');

DELETE FROM users
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'marketing_manager'));

-- roles table becomes customer-only
DELETE FROM roles WHERE name IN ('admin', 'marketing_manager');

-- sanity check
SELECT 'users' AS table_name, id, full_name, email, role_id FROM users
UNION ALL
SELECT 'internal_users', id, full_name, email, role_id FROM internal_users
ORDER BY table_name, id;

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    scope VARCHAR NOT NULL CHECK (scope IN ('customer', 'internal')),
    user_id INTEGER NOT NULL,
    token_hash VARCHAR NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);