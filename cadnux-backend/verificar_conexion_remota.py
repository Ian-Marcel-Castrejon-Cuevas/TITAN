import subprocess
import sys
import os

def verificar_usuario_remoto(equipo_remoto):
    """
    Verifica si hay usuarios conectados a una PC remota usando quser
    
    Args:
        equipo_remoto: Nombre o IP del equipo remoto
    
    Returns:
        tuple: (hay_conexion, detalles)
    """
    try:
        # Construir el comando quser remoto
        comando = f"quser /server:{equipo_remoto}"
        
        # Ejecutar el comando
        resultado = subprocess.run(
            comando,
            capture_output=True,
            text=True,
            shell=True,
            encoding='utf-8'
        )
        
        # Verificar si hubo error
        if resultado.returncode != 0:
            # Error: puede ser equipo no encontrado, sin permisos, etc.
            if "no existe" in resultado.stderr.lower() or "cannot find" in resultado.stderr.lower():
                return (None, f"❌ Equipo '{equipo_remoto}' no encontrado")
            elif "acceso denegado" in resultado.stderr.lower() or "access denied" in resultado.stderr.lower():
                return (None, f"❌ Acceso denegado a '{equipo_remoto}'. Verifica permisos.")
            else:
                return (None, f"❌ Error: {resultado.stderr.strip()}")
        
        # Procesar la salida
        lineas = resultado.stdout.strip().split('\n')
        
        if len(lineas) <= 1:
            # Solo la línea de cabecera, no hay usuarios
            return (False, "✅ No hay nadie conectado a la PC remota")
        
        # Analizar cada línea de usuario
        usuarios = []
        for linea in lineas[1:]:  # Saltar cabecera
            if linea.strip():
                partes = linea.split()
                if len(partes) >= 3:
                    nombre = partes[0]
                    # El estado puede estar en diferentes posiciones
                    if 'active' in linea.lower():
                        estado = "🟢 ACTIVO"
                    elif 'disc' in linea.lower():
                        estado = "🟡 DESCONECTADO"
                    else:
                        estado = "⚪ OTRO"
                    usuarios.append(f"   • {nombre}: {estado}")
        
        if usuarios:
            return (True, f"⚠️ Hay usuarios conectados:\n" + "\n".join(usuarios))
        else:
            return (False, "✅ No hay nadie conectado a la PC remota")
            
    except Exception as e:
        return (None, f"❌ Error inesperado: {str(e)}")

def crear_batch_temporal(equipo_remoto):
    """
    Crea un archivo .bat temporal para ejecutar quser
    """
    batch_content = f"""@echo off
echo Verificando conexiones en {equipo_remoto}...
echo.
quser /server:{equipo_remoto}
if %errorlevel% neq 0 (
    echo.
    echo No se pudo conectar al equipo remoto o no hay sesiones.
)
echo.
pause
"""
    
    batch_path = "temp_verificar_conexion.bat"
    with open(batch_path, 'w', encoding='utf-8') as f:
        f.write(batch_content)
    
    return batch_path

def main():
    print("=" * 60)
    print("🔍 VERIFICADOR DE CONEXIONES RDP REMOTAS")
    print("=" * 60)
    print()
    
    # Solicitar la PC remota al usuario
    equipo_remoto = input("Ingresa el nombre o IP de la PC remota: ").strip()
    
    if not equipo_remoto:
        print("❌ No ingresaste ningún equipo.")
        return
    
    print()
    print(f"📡 Verificando: {equipo_remoto}")
    print("-" * 40)
    
    # Usar el método Python puro (recomendado)
    hay_conexion, mensaje = verificar_usuario_remoto(equipo_remoto)
    
    print(mensaje)
    print("-" * 40)
    
    # Preguntar si quiere ejecutar el batch también
    print()
    respuesta = input("¿Quieres crear y ejecutar el archivo .bat también? (s/n): ").strip().lower()
    
    if respuesta == 's':
        batch_path = crear_batch_temporal(equipo_remoto)
        print(f"\n📄 Archivo batch creado: {batch_path}")
        print("▶️ Ejecutando...")
        print()
        
        # Ejecutar el batch
        subprocess.run(batch_path, shell=True)
        
        # Limpiar el batch después de usar
        try:
            os.remove(batch_path)
            print(f"\n🧹 Archivo temporal eliminado: {batch_path}")
        except:
            pass
    
    print("\n✨ Verificación completada.")

if __name__ == "__main__":
    main()