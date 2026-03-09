import React from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Camera, Trash2, Database } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabecera */}
        <div className="text-center mb-12">
          <ShieldCheck className="mx-auto h-16 w-16 text-blue-900 mb-4" />
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Aviso de Privacidad
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Última actualización: 4 de Marzo de 2026
          </p>
        </div>

        {/* Contenido de la Política */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
            
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Database className="h-6 w-6 text-blue-600" />
                1. Información que recopilamos
              </h2>
              <p>
                Para brindarte la mejor experiencia en la liga deportiva <strong>Flag Durango</strong>, recopilamos la siguiente información cuando te registras en nuestra aplicación móvil o sitio web:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2 text-slate-600">
                <li><strong>Información de cuenta:</strong> Nombre de usuario, correo electrónico y contraseña (encriptada).</li>
                <li><strong>Perfil de jugador/coach:</strong> Nombre real, número de jersey, posición y equipo al que perteneces.</li>
                <li><strong>Fotografías:</strong> Fotos de perfil para tu gafete digital oficial y logotipos de los equipos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Camera className="h-6 w-6 text-blue-600" />
                2. Uso de la Cámara y Galería
              </h2>
              <p>
                Nuestra aplicación móvil solicita acceso a la cámara y galería de tu dispositivo exclusivamente para permitirte subir tu <strong>foto de perfil oficial</strong> (gafete digital) o el escudo de tu equipo. Estas imágenes se almacenan de forma segura y solo se utilizan para fines de identificación dentro de la liga y estadísticas de los partidos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                3. Uso de la Información
              </h2>
              <p>Utilizamos tus datos exclusivamente para:</p>
              <ul className="list-disc pl-5 mt-4 space-y-2 text-slate-600">
                <li>Gestionar la organización de la liga, calendarios y estadísticas.</li>
                <li>Identificarte en el campo mediante tu gafete digital.</li>
                <li>Mantener el registro histórico de líderes y posiciones (touchdowns, MVP, etc.).</li>
                <li>Enviarte notificaciones relevantes sobre tus partidos o cambios de horario.</li>
              </ul>
              <p className="mt-4 font-semibold text-slate-800">
                No vendemos, alquilamos ni compartimos tus datos personales con terceros con fines comerciales.
              </p>
            </section>

           <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Trash2 className="h-6 w-6 text-blue-600" />
                4. Tus Derechos y Eliminación de Cuenta
              </h2>
              <p>
                Como usuario, tienes el control total sobre tu información. Puedes solicitar la eliminación definitiva de tu cuenta y todos tus datos personales asociados en cualquier momento.
              </p>
              <div className="mt-4 text-slate-600">
                <p className="font-semibold text-slate-800 mb-2">¿Cómo solicitar la eliminación de tu cuenta y datos?</p>
                <ul className="list-disc pl-5 space-y-3">
                  <li>
                    <strong>Opción 1 (Desde la aplicación):</strong> Ve a <em>Mi Perfil &gt; Configuración</em> y selecciona el botón <strong>"Eliminar mi cuenta"</strong>. Al hacerlo, se borrarán tus accesos y tu información personal de nuestros servidores.
                  </li>
                  <li>
                    <strong>Opción 2 (Vía Web / Correo Electrónico):</strong> Si ya no tienes la aplicación instalada, puedes solicitar la eliminación total de tus datos enviando un correo electrónico a <strong>rafafndz07@gmail.com</strong> con el asunto <em>"Solicitud de Eliminación de Cuenta"</em>. Por favor, incluye en el mensaje el correo electrónico con el que te registraste y tu nombre completo. Tu cuenta y todos los datos asociados (incluyendo fotos y tipo de sangre) serán eliminados permanentemente en un plazo máximo de 7 días hábiles.
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Mail className="h-6 w-6 text-blue-600" />
                5. Contacto
              </h2>
              <p>
                Si tienes alguna duda sobre esta política de privacidad o el manejo de tus datos, puedes contactar a la administración de la liga a través de nuestras redes sociales oficiales o acercarte a la mesa de registro durante los días de juego.
              </p>
            </section>

          </div>
          
          {/* Footer de la tarjeta */}
          <div className="bg-slate-50 p-6 border-t border-slate-200 text-center">
            <Link href="/" className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
              &larr; Volver al Inicio
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
