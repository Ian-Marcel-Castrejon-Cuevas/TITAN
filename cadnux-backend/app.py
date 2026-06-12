from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import base64
import jwt
import datetime
from datetime import timezone
from twofish import Twofish

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
DB_CONFIG = {
    'host': '192.168.8.55',
    'port': 5432,
    'database': 'asecon',
    'user': 'asecon',
    'password': 'MassLrj10$'
}

SECRET_KEY = 'CADNUX_JWT_SECRET_KEY_2024_VERY_SECURE_32_BYTES'

# Departamentos que son administradores
ADMIN_DEPARTMENTS = ['09']

def get_db_connection():
    """Obtiene conexión a PostgreSQL"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def validar_password(contrasena_input, emapassword, emallave):
    """
    Valida la contraseña encriptando la ingresada y comparando con la BD
    Este es el mismo método que funciona en el programa original
    """
    if not emallave or not emapassword:
        return contrasena_input == emapassword
    
    try:
        key_bytes = bytes.fromhex(emallave)
        contrasena_mayus = contrasena_input.upper()
        contrasena_bytes = contrasena_mayus.encode('utf-8')
        
        stored_encrypted = base64.b64decode(emapassword)
        
        # Twofish requiere bloques de 16 bytes
        pad_len = (16 - (len(contrasena_bytes) % 16)) % 16
        contrasena_padded = contrasena_bytes + (b' ' * pad_len)
        tf = Twofish(key_bytes)
        
        encrypted_bytes = b''
        for i in range(0, len(contrasena_padded), 16):
            encrypted_bytes += tf.encrypt(contrasena_padded[i:i+16])
        
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode('utf-8')
        
        return encrypted_b64 == emapassword
        
    except Exception as e:
        print(f"❌ Error validando contraseña: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de salud"""
    return jsonify({'status': 'ok', 'service': 'cadnux-backend'})

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Endpoint de login"""
    try:
        data = request.json
        usuario_ch = data.get('usuario_ch')
        password_input = data.get('password')
        
        print(f"\n{'='*50}")
        print(f"📝 Login intento para: {usuario_ch}")
        
        # Conectar a la base de datos
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor()
        
        # Consultar datos del usuario
        cursor.execute("""
            SELECT emanombre, emaappaterno, emaapmaterno, dpacvedepartamento, 
                   emffecbaja, emapassword, emallave
            FROM tbempleados 
            WHERE emausuariocarven = %s
        """, (usuario_ch,))
        
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not row:
            print(f"❌ Usuario no encontrado: {usuario_ch}")
            return jsonify({'error': 'Usuario no encontrado'}), 401
        
        (nombre, apellido_paterno, apellido_materno, departamento, 
         fecha_baja, emapassword, emallave) = row
        
        # Verificar si el usuario está dado de baja
        if fecha_baja and str(fecha_baja) != '0001-01-01':
            print(f"❌ Usuario dado de baja: {usuario_ch}")
            return jsonify({'error': 'Usuario dado de baja'}), 401
        
        print(f"✅ Usuario encontrado: {usuario_ch}")
        
        # Validar contraseña
        password_valid = validar_password(password_input, emapassword, emallave)
        
        if not password_valid:
            print(f"❌ Contraseña incorrecta para: {usuario_ch}")
            return jsonify({'error': 'Contraseña incorrecta'}), 401
        
        print(f"✅ Contraseña correcta")
        
        # Construir nombre completo
        nombre_completo = f"{nombre or ''} {apellido_paterno or ''} {apellido_materno or ''}".strip()
        es_admin = departamento in ADMIN_DEPARTMENTS
        
        print(f"📊 Departamento: {departamento}")
        print(f"👑 Es administrador: {es_admin}")
        
        # Generar token JWT
        token = jwt.encode({
            'usuario_ch': usuario_ch,
            'nombre_completo': nombre_completo,
            'departamento': departamento,
            'es_admin': es_admin,
            'exp': datetime.datetime.now(timezone.utc) + datetime.timedelta(hours=8)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'usuario_ch': usuario_ch,
            'nombre_completo': nombre_completo,
            'departamento': departamento,
            'es_admin': es_admin
        })
        
    except Exception as e:
        print(f"❌ Error en login: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-decrypt', methods=['POST'])
def test_decrypt():
    """Endpoint de prueba para verificar desencriptación"""
    try:
        data = request.json
        encrypted_b64 = data.get('encrypted')
        key_hex = data.get('key')
        
        encrypted = base64.b64decode(encrypted_b64)
        key = bytes.fromhex(key_hex)
        
        tf = Twofish(key)
        decrypted = tf.decrypt(encrypted)
        
        return jsonify({
            'encrypted_hex': encrypted.hex(),
            'key_hex': key.hex(),
            'decrypted_hex': decrypted.hex(),
            'decrypted_text': decrypted.decode('latin-1', errors='ignore')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("="*60)
    print("🚀 CADNUX Backend - Python 3.10 + Twofish")
    print("="*60)
    print("📡 Endpoints:")
    print("  POST /api/auth/login   - Login de usuario")
    print("  POST /api/test-decrypt - Prueba de desencriptación")
    print("  GET  /health           - Health check")
    print("="*60)
    app.run(host='0.0.0.0', port=5001, debug=True)