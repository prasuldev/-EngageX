INSERT INTO roles (name) VALUES ('customer') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('marketing_manager') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;