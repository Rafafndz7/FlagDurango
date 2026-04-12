import React from 'react';
import { 
  ShieldAlert, Users, Gavel, Scale, AlertTriangle, FileText, 
  Monitor, CheckSquare, Clock, CreditCard, UserCheck, 
  FileWarning, HeartPulse, Camera, ClipboardList, Ban,
  MapPin, CloudLightning, BarChart, Trophy
} from 'lucide-react';

export const metadata = {
  title: 'Reglamento Administrativo | Flag Durango',
  description: 'Reglamento oficial y normativas administrativas de la Liga Flag Durango.',
};

// ESTA LÍNEA EVITA QUE VERCEL GUARDE LA PÁGINA EN CACHÉ
export const dynamic = 'force-dynamic';

export default function ReglamentoPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header del Reglamento */}
        <div className="bg-blue-900 dark:bg-blue-950 px-8 py-10 text-center border-b border-blue-800">
          <Scale className="w-16 h-16 mx-auto text-blue-400 mb-4" />
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Reglamento Administrativo
          </h1>
          <p className="mt-3 text-lg text-blue-200">
            Liga de Tocho Bandera • Flag Durango
          </p>
        </div>

        {/* Contenido Completo */}
        <div className="px-6 md:px-10 py-10 space-y-12 text-slate-700 dark:text-slate-300">
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <FileText className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              1. Objeto del Reglamento
            </h2>
            <p className="leading-relaxed text-justify">
              El presente reglamento tiene como finalidad establecer las normas administrativas que regulan la organización, operación y funcionamiento de la liga de Tocho Bandera.
              Su cumplimiento es estricto y obligatorio para todos los participantes: equipos, jugadores, coaches, representantes, árbitros y directivos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <Users className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              2. Estructura de la Liga y Mesa Directiva
            </h2>
            <p className="mb-4">La liga estará dirigida y administrada por los siguientes órganos y sus respectivos titulares:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Director General:</strong> Rafael Ortega (Encargado de dirigir la liga, autorizar decisiones importantes y resolver controversias mayores).</li>
              <li><strong>Coordinador Disciplinario:</strong> Jaime Rodríguez (Encargado de analizar protestas, aplicar sanciones y resolver conflictos deportivos y de conducta).</li>
              <li><strong>Coordinación de Árbitros:</strong> Daniel Herrera (Responsable de la evaluación del arbitraje y aplicación estricta del reglamento. <strong>Él realiza la distribución de los árbitros de la manera que mejor considere y sin favoritismos; por lo tanto, no se permite que coaches o capitanes soliciten la asignación o veto de árbitros específicos</strong>).</li>
              <li><strong>Coordinadora de Altas, Bajas y Pagos:</strong> Penélope Álvarez (Responsable del control de rosters, elegibilidad y es la <strong>autoridad encargada del cobro de arbitraje</strong>).</li>
              <li><strong>Coordinador de Tecnologías y Mantenimiento:</strong> Rafael Fernández (Encargado del control, programación y funcionamiento de la plataforma digital Web y App. Además, es la autoridad designada para realizar las revisiones en campo y auditar que los jugadores presentes en el terreno de juego coincidan exactamente con los registrados en la plataforma).</li>
              <li><strong>Coordinador de Redes Sociales y Multimedia:</strong> Ismael Morales (Responsable de la imagen, difusión y contenido multimedia de la liga).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <ClipboardList className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              3. Registro de Equipos
            </h2>
            <p className="mb-4">Para participar en la liga, cada equipo deberá cumplir con los siguientes requisitos antes del inicio del torneo:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Realizar el registro digital del equipo en la plataforma oficial.</li>
              <li>Presentar el roster oficial completo.</li>
              <li>Cubrir la cuota de inscripción establecida.</li>
              <li>Designar a sus representantes oficiales (Coach y Capitán).</li>
            </ol>
            <p className="mt-4 text-sm italic text-slate-500">*Nota: La liga podrá limitar el número de equipos inscritos de acuerdo con la capacidad logística del torneo.*</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <Monitor className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              4. Registro de Jugadores y Plataforma
            </h2>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Todos los jugadores que pisen el campo <strong>tienen que estar obligatoriamente registrados en la plataforma oficial</strong> de la liga con nombre completo, fotografía, fecha de nacimiento e identificación.</li>
              <li>Este registro es indispensable para llevar el control de asistencia a los juegos.</li>
              <li><strong>Ningún jugador podrá participar sin estar registrado en la plataforma.</strong> Si no están registrados, no tienen derecho a jugar.</li>
              <li>El Coordinador de Tecnologías realizará chequeos de roster en campo en cualquier momento para verificar el cumplimiento estricto de esta regla.</li>
              <li>Un jugador solo puede pertenecer a un equipo por categoría en la misma temporada (podrá participar en un equipo adicional si es en categoría Mixto).</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <CheckSquare className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              5. Control de Categorías y Elegibilidad
            </h2>
            <p className="mb-4">Con el objetivo de mantener un nivel competitivo justo y evitar ventajas indebidas:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Restricción de Nivel:</strong> Queda estrictamente prohibido que un jugador de categoría superior juegue en una inferior (ej. un jugador Gold jugando en Silver, o un jugador Silver jugando en Copper).</li>
              <li><strong>Mentir en el historial:</strong> Los jugadores que sean detectados mintiendo u ocultando su historial de temporadas jugadas serán castigados severamente.</li>
              <li><strong>Sanciones por cachirules:</strong> Si se detecta un jugador inelegible (por nivel, experiencia o edad), la sanción aplicará desde la Jornada 2 o en la jornada en que sea detectado. El jugador será dado de baja inmediatamente y el equipo recibirá una <strong>sanción económica</strong>. Si el jugador sancionado continúa intentando jugar, <strong>el equipo completo será dado de baja del torneo</strong>.</li>
              <li><strong>Ascensos de Categoría:</strong> Sí está permitido que un jugador suba de categoría (de Copper a Silver, o de Silver a Gold). Sin embargo, una vez que el jugador asciende y participa en la categoría superior, <strong>ya no podrá volver a bajar</strong> a la categoría anterior.</li>
              <li><strong>Elegibilidad para Playoffs:</strong> Para que un jugador tenga derecho a participar en la postemporada (Playoffs), deberá cumplir con al menos el <strong>50% de asistencia a los juegos de temporada regular, más uno</strong> (50% + 1).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <Clock className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              6. Calendario, Reglas IFAF y Equipamiento Ilegal
            </h2>
            <ol className="list-decimal pl-6 space-y-4">
              <li>
                <strong>Reglamento IFAF y Contacto Accidental:</strong> El desarrollo de los partidos se rige estrictamente bajo el reglamento oficial de la <strong>IFAF (International Federation of American Football)</strong> en su formato 5 vs 5 (sin contacto intencional ni bloqueos). 
                <strong>Cabe aclarar que, aunque el Flag Football es un deporte sin contacto, por la naturaleza, inercia y velocidad del juego no está exento de que ocurran contactos accidentales.</strong> Estos incidentes serán interpretados y juzgados exclusivamente por los árbitros en el campo para determinar si existió intención, negligencia o si fue una acción fortuita propia del deporte.
              </li>
              <li><strong>Rol de Juego y Reprogramaciones:</strong> Una vez que todos los equipos aprueben el rol de juego (calendario de partidos), <strong>no se podrá modificar bajo ninguna circunstancia</strong>. La única excepción permitida para realizar un cambio será si tanto el Coach como el Capitán del equipo contrario aprueban la modificación.</li>
              <li><strong>Tolerancia y Forfeit:</strong> Habrá un tiempo de espera máximo de <strong>5 minutos</strong> respecto al horario programado. Si un equipo no se presenta a tiempo, perderá el partido por <strong>Forfeit</strong>, arrojando un resultado oficial de <strong>18-0</strong> en su contra.</li>
              <li><strong>Mínimo de Jugadores:</strong> Un equipo podrá iniciar y jugar el primer tiempo con un mínimo de <strong>4 jugadores</strong>. Si para el inicio del segundo tiempo no logran completar el mínimo reglamentario en el campo, perderán el partido automáticamente.</li>
              <li><strong>Uniformes y Banderas:</strong> Es obligatorio presentarse con uniformes completos (mismo color). Las playeras deben estar <strong>fajadas en todo momento</strong> o ser lo suficientemente cortas para no cubrir o interferir con las banderas. Las banderas deben colocarse a los costados de la cadera.</li>
              
              <li className="bg-red-50 dark:bg-red-950/20 p-4 rounded-md border-l-4 border-red-500 mt-4">
                <strong className="text-red-800 dark:text-red-400 flex items-center mb-2"><Ban className="w-5 h-5 mr-2" /> Equipamiento y Accesorios Ilegales (IFAF):</strong>
                <p className="text-sm md:text-base mb-2">Queda <strong>estrictamente prohibido</strong> ingresar al campo con el siguiente equipamiento. El árbitro obligará al jugador a salir del terreno de juego hasta que corrija la infracción:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm md:text-base">
                  <li><strong>Bolsillos y Cierres:</strong> Shorts o pantalones con bolsillos, trabillas o cierres. (Si tienen bolsillos, deben estar completamente cosidos de fábrica. <em>No se permite taparlos con cinta/tape</em>).</li>
                  <li><strong>Joyería:</strong> Uso de anillos, collares, aretes, pulseras o relojes (las alertas médicas deben ir cubiertas con cinta).</li>
                  <li><strong>Calzado Ilegal:</strong> Tacos (cleats) de metal o con tachones removibles de metal.</li>
                  <li><strong>Sustancias Pegajosas:</strong> Uso de resina, pegamento o cualquier sustancia adherente en manos, cuerpo, banderas o uniforme.</li>
                  <li><strong>Gorras y Protecciones:</strong> Gorras con visera rígida. Además, cualquier rodillera, férula o protección rígida debe estar cubierta en su totalidad por material acolchado suave.</li>
                </ul>
              </li>
              <li><strong>Protector Bucal:</strong> Se exige y recomienda ampliamente el uso de protector bucal en todo momento durante las jugadas para prevenir lesiones dentales o maxilares.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <CreditCard className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              7. Cuotas, Pagos e Instalaciones
            </h2>
            <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-5 rounded-r-lg my-6 text-red-900 dark:text-red-200 shadow-sm">
              <h3 className="font-bold flex items-center text-red-700 dark:text-red-400 text-lg">
                <AlertTriangle className="w-6 h-6 mr-2" /> PAGO DE ARBITRAJE OBLIGATORIO
              </h3>
              <p className="mt-2 text-base">
                El pago de arbitraje es de <strong>$320 MXN por juego</strong> y es de carácter OBLIGATORIO. En caso de no cubrir este pago, el equipo será sancionado y <strong>no tendrá derecho a jugar su siguiente partido</strong> hasta que pague el adeudo a la encargada correspondiente.
              </p>
            </div>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Acceso a Instalaciones:</strong> Se debe cubrir una cuota de entrada a las instalaciones ($10 pesos, cobrados directamente por el SNTSS).</li>
              <li><strong>Uso del espacio:</strong> Es obligación de todos los jugadores y acompañantes respetar el uso de los accesos y mantener en buen estado las instalaciones.</li>
              <li>Equipos con adeudos podrán ser sancionados con pérdida de puntos, suspensión de partidos o baja del torneo.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <MapPin className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              8. Sede Oficial, Horarios y Partidos Extraoficiales
            </h2>
            <ul className="list-disc pl-6 space-y-4">
              <li>
                <strong>Sede y Horarios Oficiales:</strong> El campo oficial de la liga es el <strong>Deportivo Tapias</strong>. La operación formal de la liga se lleva a cabo únicamente los días <strong>domingo en un horario de 8:00 a.m. a 7:00 p.m.</strong> Dentro de este horario y ubicación, la liga garantiza la infraestructura completa: campos marcados, arbitraje, hidratación, paramédicos, staff e instalaciones adecuadas para el desarrollo de los juegos.
              </li>
              <li>
                <strong>Partidos Extraoficiales:</strong> Los juegos realizados fuera de estos días y horarios, como es el caso de los encuentros entre semana, son considerados juegos extraoficiales. Estos se llevan a cabo por solicitud y decisión de los propios equipos, generalmente debido a que no pueden participar en los horarios oficiales del domingo.
              </li>
              <li>
                <strong>Logística fuera de sede:</strong> En los encuentros extraoficiales, la logística, organización y condiciones del juego (renta de campo, marcado, balones, etc.) corresponden <strong>exclusivamente al equipo local</strong>. La liga, en la medida de lo posible y con previo aviso, apoyará únicamente con la asignación del cuerpo arbitral.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <CloudLightning className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              9. Protocolo de Clima y Fuerza Mayor
            </h2>
            <p className="mb-4 text-justify">
              Para salvaguardar la integridad física de todos los asistentes, la liga se reserva el derecho de suspender, retrasar o reprogramar partidos en caso de condiciones climáticas extremas (tormentas eléctricas, lluvias torrenciales que inunden el campo) o situaciones de fuerza mayor.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Si se detecta actividad eléctrica cercana, el partido se detendrá inmediatamente.</li>
              <li>Si un partido es suspendido habiéndose jugado <strong>al menos la primera mitad completa</strong>, el marcador al momento de la suspensión se considerará oficial y definitivo.</li>
              <li>Si el partido es suspendido antes del medio tiempo, la liga determinará fecha y hora para reanudar el tiempo restante con el mismo marcador que se tenía.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <UserCheck className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              10. Representantes de Equipo
            </h2>
            <p className="leading-relaxed text-justify mb-6">
              Cada equipo nombrará a un Coach y/o Capitán, quienes serán los únicos autorizados para la comunicación con la liga, hacer cumplir el reglamento a sus jugadores y realizar protestas formales.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-6 rounded-xl text-amber-900 dark:text-amber-200 shadow-sm">
              <h3 className="font-bold flex items-center text-amber-700 dark:text-amber-500 text-lg mb-4 border-b border-amber-200 dark:border-amber-800 pb-2">
                <ShieldAlert className="w-6 h-6 mr-2" /> LIBERTAD DE JUGADORES Y CERO FAVORITISMOS
              </h3>
              <ul className="space-y-4 text-sm md:text-base">
                <li>
                  <strong className="text-amber-800 dark:text-amber-400">Libertad de Elección y Periodo de Fichajes:</strong> Los jugadores tienen el derecho de jugar en el equipo de su preferencia. Ningún coach o capitán puede obligarlos a permanecer en sus equipos en contra de su voluntad. <strong>Sin embargo, para mantener la equidad del torneo, el límite oficial para cambiar de equipo es la Jornada 2.</strong> A partir de la Jornada 3, el registro se cierra y el jugador deberá concluir la temporada con su equipo actual para poder cambiar en la siguiente temporada.
                </li>
                <li>
                  <strong className="text-amber-800 dark:text-amber-400">Imparcialidad Total:</strong> La liga <strong>no tiene ninguna preferencia</strong> hacia ningún equipo, coach o capitán. Las mismas reglas se aplicarán a todos por igual, sin excepción.
                </li>
                <li>
                  <strong className="text-amber-800 dark:text-amber-400">Cero Intimidación:</strong> Si se descubre, reporta o comprueba que alguien intenta amedrentar, intimidar o amenazar a jugadores mencionando que tiene <em>"paros"</em> o favores con alguien del staff de la liga, la persona <strong>será puesta bajo investigación inmediata y fuertemente sancionada</strong> si se encuentra su culpabilidad.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <Gavel className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              11. Disciplina, Sanciones y Autoridad Arbitral
            </h2>
            <p className="mb-4">La liga se rige por el respeto y la deportividad. Se aplicarán las siguientes reglas:</p>
            <ul className="list-disc pl-6 space-y-4">
              <li><strong>Autoridad General para Sancionar:</strong> Tanto el cuerpo arbitral como cualquier coordinador o miembro de la mesa directiva de la liga tienen la plena facultad de marcar faltas, aplicar castigos o expulsar a participantes si detectan el incumplimiento de cualquier norma de este reglamento, dentro y fuera del terreno de juego.</li>
              <li><strong>Faltas de respeto y Conducta Antideportiva:</strong> Cualquier falta de respeto al árbitro o conducta antideportiva por parte de jugadores, coaches, padres de familia o porra (afición), <strong>facultará al árbitro para detener y finalizar el juego inmediatamente</strong>. El equipo infractor perderá el partido por <strong>Forfeit (18-0)</strong> y recibirá una sanción económica. Si el problema o la indisciplina se considera grave, el equipo completo podrá ser suspendido o dado de baja del torneo de manera definitiva.</li>
              <li><strong>Expulsiones Comunes:</strong> Un jugador expulsado recibirá un partido de suspensión automático. Aunque pague su multa correspondiente, <strong>no tiene derecho a jugar el siguiente partido</strong> y no podrá regresar al campo hasta que la sanción económica haya sido cubierta en su totalidad.</li>
              <li><strong>Faltas de respeto desde la banca:</strong> Si el árbitro escucha insultos o faltas de respeto provenientes de la banca y no se identifica al culpable directo, <strong>el Capitán del equipo será expulsado</strong>. (En el caso exclusivo de la <strong>categoría Teens</strong>, quien será expulsado será el <strong>Coach</strong>).</li>
              <li><strong>Lenguaje y Palabras Altisonantes:</strong> Queda estrictamente prohibido el uso de palabras altisonantes, insultos o lenguaje ofensivo en el campo. Esta conducta amerita expulsión o castigo inmediato. Tanto los Árbitros en el terreno de juego como el Coordinador Disciplinario tienen total autoridad para marcar la falta y expulsar a cualquier jugador infractor.</li>
              <li><strong>Conatos de Pelea:</strong> Si ocurre un conato de pelea o riña involucrando a 2 o más jugadores, los involucrados serán <strong>expulsados automáticamente</strong> del recinto. Posteriormente, el Staff y la Directiva tendrán una reunión obligatoria para determinar si los jugadores involucrados pueden seguir participando en la liga o si quedan expulsados por el resto de la temporada.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <FileWarning className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              12. Protestas Administrativas
            </h2>
            <p className="leading-relaxed text-justify">
              Toda protesta deberá presentarse por el representante oficial, por escrito, dentro de la <strong>siguiente hora posterior a la finalización del juego</strong>, acompañada de una cuota de protesta de <strong>$200 pesos</strong>. El Comité Disciplinario analizará el caso. Si la protesta procede a favor del equipo, la cuota será reembolsada.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <HeartPulse className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              13. Riesgos Deportivos, Responsabilidad y Servicios Médicos
            </h2>
            <ol className="list-decimal pl-6 space-y-3">
              <li>El Tocho Bandera es un deporte de contacto. Cada jugador participa bajo su propio riesgo y responsabilidad.</li>
              <li><strong>Deslinde de Responsabilidad:</strong> La liga se deslinda totalmente de cualquier accidente, lesión o eventualidad médica ocurrida dentro del terreno de juego o instalaciones.</li>
              <li><strong>Apoyo de Primeros Auxilios:</strong> Como medida de apoyo, la liga contará con la presencia de un <strong>paramédico de primer instante</strong> en el campo, con la única finalidad de brindar una intervención rápida y estabilización en lo que el jugador afectado se traslada por sus propios medios a su médico familiar o institución de salud.</li>
              <li><strong>Protocolo de Atención Médica en el Campo:</strong> En caso de que un jugador resulte lesionado, <strong>el único personal autorizado para acercarse es el Coach o el Capitán</strong>. Su acercamiento será <em>exclusivamente</em> para informar al personal médico sobre posibles alergias o condiciones de salud previas del jugador. Queda <strong>estrictamente prohibido</strong> intentar ordenar qué procedimiento realizar, ya que las paramédicas cuentan con la certificación adecuada para la atención. El Coach o Capitán solo podrán auxiliar físicamente si el personal médico lo solicita explícitamente. El resto del equipo deberá mantener distancia para no entorpecer las labores de auxilio.</li>
              <li>Se recomienda encarecidamente a los equipos contar con seguro deportivo y exigir una revisión médica previa a sus jugadores (notificando cualquier condición al coach).</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <Camera className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              14. Imagen y Difusión
            </h2>
            <p className="leading-relaxed text-justify">
              La liga, a través de su Coordinación de Redes Sociales, podrá utilizar fotografías, videos e imágenes de los juegos y jugadores para fines de promoción deportiva. La participación en la liga implica el consentimiento implícito para el uso de esta imagen.
            </p>
          </section>

          {/* NUEVA SECCIÓN DE ESTADÍSTICAS */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <BarChart className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              15. Criterios de Estadísticas Individuales
            </h2>
            <p className="mb-4">Para llevar un control justo y estandarizado del rendimiento de los jugadores, la toma de estadísticas se rige estrictamente bajo los siguientes criterios:</p>
            <ul className="list-disc pl-6 space-y-4">
              <li>
                <strong>Pases de Anotación (QB Pass):</strong> La estadística denominada "QB Pass" se refiere única y exclusivamente a los pases que terminan en anotación (Touchdowns lanzados).
              </li>
              <li>
                <strong>Anotaciones de Carrera e Intercepciones (Pick-six):</strong> Las anotaciones logradas por vía terrestre (touchdown de carrera) no se contabilizan para las estadísticas individuales actuales. Asimismo, un <em>Pick-six</em> (intercepción devuelta hasta la zona de anotación) no cuenta como touchdown para el jugador defensivo en la tabla de anotación; sin embargo, <strong>sí se le registra como una intercepción en contra al mariscal de campo (QB)</strong> que lanzó el pase.
              </li>
              <li>
                <strong>Capturas (Sacks):</strong> Es fundamental diferenciar entre el Quarterback oficial de la jugada y un pasador ocasional. Las capturas (Sacks) solo se registrarán en la estadística defensiva cuando la acción de quitar la bandera detrás de la línea de golpeo se realice sobre el <strong>QB nominal</strong>. Detener a un jugador distinto (como un corredor o receptor intentando un pase sorpresa) no contará como sack.
              </li>
            </ul>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-xl text-emerald-900 dark:text-emerald-200 shadow-sm mt-6">
              <h3 className="font-bold flex items-center text-emerald-700 dark:text-emerald-500 text-lg mb-3 border-b border-emerald-200 dark:border-emerald-800 pb-2">
                <Trophy className="w-6 h-6 mr-2" /> REGLA DE NOCAUT Y DEPORTIVIDAD
              </h3>
              <p className="text-sm md:text-base">
                En pro del respeto al rival y para fomentar la deportividad, en el momento exacto en que un partido alcance la diferencia de puntos establecida para la regla de <strong>"Nocaut"</strong> (terminación anticipada del juego por amplia superioridad), <strong>se detendrá de inmediato el registro de estadísticas individuales</strong>. Esto se implementa para evitar humillaciones innecesarias y desincentivar que los equipos busquen abultar números personales en un encuentro que ya está definido.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-4 border-b pb-2">
              <ShieldAlert className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
              16. Facultades de la Directiva y Aceptación
            </h2>
            <ul className="list-disc pl-6 space-y-3">
              <li>Las decisiones de la mesa directiva (interpretación del reglamento, situaciones no contempladas y resoluciones disciplinarias) serán definitivas e inapelables.</li>
              <li>La inscripción de un equipo y/o jugador implica la <strong>aceptación total e incondicional</strong> de este reglamento, comprometiéndose a respetarlo durante toda la temporada.</li>
            </ul>
          </section>

          {/* Footer del reglamento */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm text-center text-slate-500">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Mesa Directiva • Liga Flag Durango</p>
            <p className="mt-2">Última actualización: Temporada en curso</p>
          </div>

        </div>
      </div>
    </div>
  );
}
