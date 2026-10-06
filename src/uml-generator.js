/**
 * Generador y Sintetizador de la Suite Completa de 14 Diagramas UML Estándar OMG
 * Permite a la IA y al motor de Génesis modelar la arquitectura completa
 * mientras el usuario habla de su idea y antes de aprobar la cabina.
 */

export function generateDefaultUmlSuite(projectName = 'App', options = {}) {
  const pName = projectName || 'Sistema'
  const safePName = pName.replace(/[^a-zA-Z0-9]/g, '') || 'Core'
  const cleanPName = pName.replace(/["\r\n]/g, '').trim() || 'Sistema'

  const services = options.architecture?.services || options.services || [
    { label: 'Web Application & API', type: 'Frontend / API' },
    { label: 'Base de Datos Principal', type: 'Database' }
  ]
  const rawAppSvc = services.find(s => s.type?.includes('Frontend') || s.type?.includes('API'))?.label || services[0]?.label || 'Web Application & API'
  const rawDbSvc = services.find(s => s.type?.includes('Database') || s.type?.includes('Data'))?.label || services[1]?.label || 'Base de Datos Principal'
  const appSvc = rawAppSvc.replace(/["\r\n]/g, '').trim()
  const dbSvc = rawDbSvc.replace(/["\r\n]/g, '').trim()

  // Actores y Personas del usuario
  const personas = options.personas || options.actors || [
    { role: 'Usuario Final' },
    { role: 'Administrador' }
  ]
  const rawMainRole = personas[0]?.role || personas[0]?.name || 'Usuario'
  const rawAdminRole = personas[1]?.role || personas[1]?.name || 'Administrador'
  const mainRole = rawMainRole.replace(/["\r\n]/g, '').trim()
  const adminRole = rawAdminRole.replace(/["\r\n]/g, '').trim()

  // Entidades y Tablas identificadas
  const rawTables = options.tables || options.database?.tables || options.database || []
  const tableNames = rawTables.map(t => (typeof t === 'string' ? t : t.table || t.name)).filter(Boolean)
  const mainEntityName = (tableNames[0] || `${safePName}Entity`).replace(/[^a-zA-Z0-9_]/g, '')
  const secondEntityName = (tableNames[1] || 'Operacion').replace(/[^a-zA-Z0-9_]/g, '')

  // Historias y reglas
  const stories = options.stories || options.requirements?.userStories || []
  const rawMainAction = stories[0]?.action || 'Gestionar recursos en la plataforma'
  const mainAction = rawMainAction.replace(/["\r\n]/g, '').trim()

  // Secuencia personalizada si viene de la IA
  const customSeqMermaid = (typeof options.sequenceUml === 'string' && options.sequenceUml.includes('sequenceDiagram'))
    ? options.sequenceUml
    : (options.sequences?.[0]?.mermaid && options.sequences[0].mermaid.includes('sequenceDiagram'))
      ? options.sequences[0].mermaid
      : null

  // FSM personalizado si viene de la IA
  const customFsmMermaid = (typeof options.stateMachine === 'string' && options.stateMachine.includes('stateDiagram'))
    ? options.stateMachine
    : (options.stateMachines?.[0]?.mermaid && options.stateMachines[0].mermaid.includes('stateDiagram'))
      ? options.stateMachines[0].mermaid
      : null

  return [
    {
      id: 'UML-01-CLASS',
      number: 1,
      category: 'structural',
      categoryName: 'Estructural',
      type: 'class',
      typeName: 'Diagrama de Clases',
      name: `Modelo de Clases del Dominio (${cleanPName})`,
      description: `Estructura de entidades, atributos, métodos y relaciones centrales de ${cleanPName} sintetizadas durante el chat.`,
      elements: ['Usuario', 'Sesion', mainEntityName, secondEntityName, 'ControladorAPI', 'RepositorioDatos'],
      mermaid: `classDiagram
    class Usuario {
        +String id
        +String email
        +String rol
        +autenticar(): Boolean
    }
    class Sesion {
        +String token
        +DateTime expiraEn
        +validar(): Boolean
    }
    class ${mainEntityName} {
        +String id
        +String titulo
        +String estado
        +actualizarEstado(nuevoEstado)
    }
    class ${secondEntityName} {
        +String id
        +DateTime fechaRegistro
        +procesar()
    }
    class ControladorAPI {
        +manejarPeticion(req, res)
        +despacharServicio()
    }
    class RepositorioDatos {
        +obtenerPorId(id)
        +guardar(entidad)
        +eliminar(id)
    }
    Usuario "1" --> "*" Sesion : inicia
    Usuario "1" --> "*" ${mainEntityName} : gestiona
    ${mainEntityName} "1" --> "*" ${secondEntityName} : genera
    ControladorAPI ..> RepositorioDatos : invoca
    RepositorioDatos ..> ${mainEntityName} : persiste`
    },
    {
      id: 'UML-02-OBJECT',
      number: 2,
      category: 'structural',
      categoryName: 'Estructural',
      type: 'object',
      typeName: 'Diagrama de Objetos',
      name: `Instancias Activas en Memoria (${cleanPName})`,
      description: `Snapshot de instancias de objetos y sus estados concretos durante la ejecución de ${cleanPName}.`,
      elements: [`instancia${mainRole.replace(/[^a-zA-Z0-9]/g, '')}`, 'sesionActiva', `recurso${mainEntityName}`, 'poolConexiones'],
      mermaid: `classDiagram
    class usuarioPrincipal {
        id = "usr-01"
        rol = "${mainRole}"
        activo = true
    }
    class sesionActiva {
        token = "jwt.session.token"
        expiracion = "24h"
    }
    class entidadActual {
        id = "item-99"
        tipo = "${mainEntityName}"
        estado = "ACTIVO"
    }
    class poolConexiones {
        motor = "${dbSvc}"
        conexionesVivas = 5
        salud = "OPTIMA"
    }
    usuarioPrincipal ..> sesionActiva : autenticado con
    usuarioPrincipal ..> entidadActual : manipula
    entidadActual ..> poolConexiones : guardado en`
    },
    {
      id: 'UML-03-COMPONENT',
      number: 3,
      category: 'structural',
      categoryName: 'Estructural',
      type: 'component',
      typeName: 'Diagrama de Componentes',
      name: `Componentes de Arquitectura (${cleanPName})`,
      description: `Módulos desacoplados y contratos entre capas del sistema ${cleanPName}.`,
      elements: ['FrontendClient', 'ApiGateway', 'BusinessCore', 'DataAccess', 'StorageDB'],
      mermaid: `graph TD
    subgraph CapaPresentacion ["Capa de Presentación & UI"]
        UI["${appSvc} (Cliente Web)"]
    end
    subgraph CapaLogica ["Capa de Negocio & Servicios"]
        ROUTER["Router & Controladores REST"]
        CORE["Core Domain Services (${cleanPName})"]
        AUTH["Módulo de Autenticación & Permisos"]
    end
    subgraph CapaPersistencia ["Capa de Datos & Infraestructura"]
        ORM["Mapeador ORM / Consultas SQL"]
        DB["${dbSvc}"]
    end
    UI -->|Peticiones HTTP/JSON| ROUTER
    ROUTER --> AUTH
    ROUTER --> CORE
    CORE --> ORM
    ORM -->|TCP / Enlace de Datos| DB`
    },
    {
      id: 'UML-04-DEPLOYMENT',
      number: 4,
      category: 'structural',
      categoryName: 'Estructural',
      type: 'deployment',
      typeName: 'Diagrama de Despliegue',
      name: `Nodos de Infraestructura y Despliegue`,
      description: `Topología física y de contenedores donde se ejecuta ${cleanPName}.`,
      elements: ['DispositivoCliente', 'ServidorApp', 'ContenedorBD', 'RedLocal'],
      mermaid: `graph TB
    subgraph NodoCliente ["Dispositivo de Usuario / Navegador"]
        BROWSER["Cliente Web SPA / PWA (${mainRole})"]
    end
    subgraph ServidorAplicacion ["Servidor de Aplicación / Docker Node"]
        APP["${appSvc}"]
        PROXY["Proxy Inverso / SSL Gateway"]
    end
    subgraph ServidorBaseDatos ["Servidor de Base de Datos"]
        DATABASE["${dbSvc}"]
    end
    BROWSER <-->|HTTPS :443| PROXY
    PROXY <-->|Localhost / Socket| APP
    APP <-->|Puerto TCP Seguro| DATABASE`
    },
    {
      id: 'UML-05-PACKAGE',
      number: 5,
      category: 'structural',
      categoryName: 'Estructural',
      type: 'package',
      typeName: 'Diagrama de Paquetes',
      name: `Estructura de Paquetes y Módulos`,
      description: `Organización del árbol de código fuente y dependencias internas de ${cleanPName}.`,
      elements: ['routes', 'controllers', 'services', 'models', 'database'],
      mermaid: `graph TD
    subgraph PaqueteRaiz ["${cleanPName} Project Root"]
        subgraph pkg_routes ["routes / api"]
            R1["endpoints.ts"]
        end
        subgraph pkg_controllers ["controllers"]
            C1["${mainEntityName.toLowerCase()}Controller.ts"]
            C2["authController.ts"]
        end
        subgraph pkg_services ["services (Business Domain)"]
            S1["${mainEntityName.toLowerCase()}Service.ts"]
            S2["validationService.ts"]
        end
        subgraph pkg_models ["models / schema"]
            M1["${mainEntityName.toLowerCase()}.model.ts"]
        end
        subgraph pkg_db ["database / migrations"]
            D1["connection.ts"]
            D2["schema.sql"]
        end
    end
    pkg_routes -.->|despacha| pkg_controllers
    pkg_controllers -.->|ejecuta| pkg_services
    pkg_services -.->|opera| pkg_models
    pkg_services -.->|consulta| pkg_db`
    },
    {
      id: 'UML-06-COMPOSITE',
      number: 6,
      category: 'structural',
      categoryName: 'Estructural',
      type: 'composite',
      typeName: 'Diagrama de Estructura Compuesta',
      name: `Estructura Compuesta Interna (Puertos y Partes)`,
      description: `Puertos de entrada/salida y conectores internos del sistema ${cleanPName}.`,
      elements: ['PuertoHTTP', 'PuertoAuth', 'RouterInterno', 'GestorReglas', 'ConectorBD'],
      mermaid: `graph LR
    subgraph ContenedorSistema ["Sistema Central: ${cleanPName}"]
        direction LR
        pWeb(["Puerto: Web / REST"])
        pAuth(["Puerto: Autenticación"])
        subgraph Enrutamiento ["Subsistema de Entrada"]
            Router["Enrutador Principal"]
            FiltroSeg["Filtro de Seguridad"]
        end
        subgraph ProcesadorDominio ["Subsistema de Negocio"]
            MotorReglas["Motor de Reglas & Validación"]
            GestorTransaccional["Gestor Transaccional"]
        end
        subgraph SalidaDatos ["Subsistema de Persistencia"]
            PoolDB["Conector de Base de Datos"]
        end
    end
    pWeb --> Router
    pAuth --> FiltroSeg
    FiltroSeg --> Router
    Router --> MotorReglas
    MotorReglas --> GestorTransaccional
    GestorTransaccional --> PoolDB`
    },
    {
      id: 'UML-07-PROFILE',
      number: 7,
      category: 'structural',
      categoryName: 'Estructural',
      type: 'profile',
      typeName: 'Diagrama de Perfil',
      name: `Perfil UML y Estereotipos del Dominio`,
      description: `Extensiones y estereotipos formales del metamodelo UML aplicados a ${cleanPName}.`,
      elements: ['Metaclase', 'Entity', 'Service', 'Repository', 'Secured'],
      mermaid: `classDiagram
    class ElementoClasificador {
        <<metaclass>>
        +String nombre
    }
    class Estereotipo_Entity {
        <<stereotype>>
        +String tablaAsociada
        +Boolean persistible
    }
    class Estereotipo_Service {
        <<stereotype>>
        +Boolean transaccional
        +String capa
    }
    class Estereotipo_Secured {
        <<stereotype>>
        +String rolesPermitidos
        +Boolean requiereJWT
    }
    class Estereotipo_DTO {
        <<stereotype>>
        +Boolean validado
    }
    ElementoClasificador <|-- Estereotipo_Entity : extiende
    ElementoClasificador <|-- Estereotipo_Service : extiende
    ElementoClasificador <|-- Estereotipo_Secured : extiende
    ElementoClasificador <|-- Estereotipo_DTO : extiende`
    },
    {
      id: 'UML-08-USECASE',
      number: 8,
      category: 'behavioral',
      categoryName: 'Comportamiento',
      type: 'usecase',
      typeName: 'Diagrama de Casos de Uso',
      name: `Casos de Uso Principales (${cleanPName})`,
      description: `Interacción entre los actores del negocio y las funcionalidades principales descubiertas durante la conversación.`,
      elements: [mainRole, adminRole, 'UC_Login', `UC_Gestionar_${mainEntityName}`, 'UC_Consultar', 'UC_Auditoria'],
      mermaid: `graph LR
    subgraph Actores ["Actores del Sistema"]
        User(["👤 ${mainRole}"])
        Admin(["🛡️ ${adminRole}"])
    end
    subgraph SistemaCasos ["Casos de Uso: ${cleanPName}"]
        UC1(["UC-01: Autenticación & Registro"])
        UC2(["UC-02: ${mainAction}"])
        UC3(["UC-03: Consultar Dashboard & Reportes"])
        UC4(["UC-04: Administrar Reglas del Sistema"])
        UC5(["UC-05: Auditoría y Registro de Operaciones"])
    end
    User --> UC1
    User --> UC2
    User --> UC3
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5`
    },
    {
      id: 'UML-09-ACTIVITY',
      number: 9,
      category: 'behavioral',
      categoryName: 'Comportamiento',
      type: 'activity',
      typeName: 'Diagrama de Actividades',
      name: `Flujo de Actividades y Procesamiento`,
      description: `Secuencia operacional y toma de decisiones paso a paso en ${cleanPName}.`,
      elements: ['Inicio', 'RecibirPeticion', 'ValidarAutenticacion', 'VerificarReglas', 'PersistirBD', 'Respuesta'],
      mermaid: `stateDiagram-v2
    [*] --> RecibirPeticion
    RecibirPeticion --> ValidarAutenticacion
    ValidarAutenticacion --> RechazarPeticion : Credenciales inválidas
    ValidarAutenticacion --> VerificarReglasNegocio : Token válido
    VerificarReglasNegocio --> NotificarError : Falla validación de reglas
    VerificarReglasNegocio --> EjecutarTransaccionBD : Reglas aprobadas
    EjecutarTransaccionBD --> ConfirmarPersistencia
    ConfirmarPersistencia --> GenerarRespuestaJSON
    RechazarPeticion --> [*]
    NotificarError --> [*]
    GenerarRespuestaJSON --> [*]`
    },
    {
      id: 'UML-10-STATE',
      number: 10,
      category: 'behavioral',
      categoryName: 'Comportamiento',
      type: 'state',
      typeName: 'Diagrama de Máquina de Estados',
      name: `Ciclo de Vida de ${mainEntityName} (FSM)`,
      description: `Estados válidos y transiciones deterministas de la entidad central de ${cleanPName}.`,
      elements: ['Borrador', 'Pendiente', 'EnProceso', 'Completado', 'Cancelado'],
      mermaid: customFsmMermaid || `stateDiagram-v2
    [*] --> Borrador : Creación inicial
    Borrador --> Pendiente : Enviar para procesamiento
    Pendiente --> EnProceso : Asignar / Iniciar ejecución
    EnProceso --> Revision : Validar resultados
    Revision --> EnProceso : Requiere ajustes
    Revision --> Completado : Aprobación final
    Pendiente --> Cancelado : Cancelado por usuario
    EnProceso --> Cancelado : Abortado por excepción
    Completado --> [*]
    Cancelado --> [*]`
    },
    {
      id: 'UML-11-SEQUENCE',
      number: 11,
      category: 'behavioral',
      categoryName: 'Comportamiento (Interacción)',
      type: 'sequence',
      typeName: 'Diagrama de Secuencia',
      name: `Secuencia de Interacción Transaccional (${cleanPName})`,
      description: `Intercambio cronológico de mensajes entre actor, capa de presentación y almacenamiento.`,
      elements: [mainRole, appSvc, dbSvc],
      mermaid: customSeqMermaid || `sequenceDiagram
    autonumber
    actor U as 👤 ${mainRole.replace(/[^a-zA-Z0-9_\s]/g, '')}
    participant API as 🖥️ ${appSvc.replace(/[^a-zA-Z0-9_\s]/g, '')}
    participant DB as 🐘 ${dbSvc.replace(/[^a-zA-Z0-9_\s]/g, '')}
    U->>API: 1. Petición autenticada con datos
    API->>API: 2. Validación de esquema y tokens
    API->>DB: 3. Consulta / Escritura transaccional en ${mainEntityName}
    DB-->>API: 4. Confirmación de datos persistidos
    API->>API: 5. Preparación de DTO de respuesta
    API-->>U: 6. Respuesta HTTP 200 (JSON confirmado)`
    },
    {
      id: 'UML-12-COMMUNICATION',
      number: 12,
      category: 'behavioral',
      categoryName: 'Comportamiento (Interacción)',
      type: 'communication',
      typeName: 'Diagrama de Comunicación',
      name: `Colaboración y Enlaces entre Partes`,
      description: `Topología de colaboración con secuencia numerada de interacción entre nodos de ${cleanPName}.`,
      elements: ['ClienteWeb', 'EnrutadorAPI', 'ServicioCore', 'AlmacenBD'],
      mermaid: `graph LR
    Cliente["👤 ${mainRole}"] ---|"1: solicita acción"| Enrutador["⚡ ${appSvc}"]
    Enrutador ---|"2: valida y delega"| ServicioCore["📦 Dominio ${cleanPName}"]
    ServicioCore ---|"3: ejecuta consulta"| AlmacenBD["🐘 ${dbSvc}"]
    AlmacenBD ---|"4: retorna datos"| ServicioCore
    ServicioCore ---|"5: confirma respuesta"| Enrutador
    Enrutador ---|"6: renderiza vista"| Cliente`
    },
    {
      id: 'UML-13-TIMING',
      number: 13,
      category: 'behavioral',
      categoryName: 'Comportamiento (Interacción)',
      type: 'timing',
      typeName: 'Diagrama de Tiempos (Timing)',
      name: `Cronograma Temporal y Latencias del Ciclo de Vida`,
      description: `Línea temporal de ejecución y cambios de estado con latencias estimadas para ${cleanPName}.`,
      elements: ['Red', 'Middleware', 'Procesamiento', 'BaseDatos', 'Renderizado'],
      mermaid: `gantt
    title Cronograma Temporal de Ejecucion - ${cleanPName}
    dateFormat X
    axisFormat %s ms
    section Red & Transporte
    Latencia de Red (Request)    :0, 35
    section Servidor de Aplicacion
    Autenticacion y Middlewares  :35, 60
    Logica de Negocio y Reglas   :60, 110
    section Capa de Persistencia
    Ejecucion de Query en BD     :110, 170
    section Respuesta al Cliente
    Serializacion y Envio        :170, 200
    Render Reactivo en Pantalla  :200, 240`
    },
    {
      id: 'UML-14-INTERACTION-OVERVIEW',
      number: 14,
      category: 'behavioral',
      categoryName: 'Comportamiento (Interacción)',
      type: 'interaction-overview',
      typeName: 'Diagrama Global de Interacción',
      name: `Vista General de Interacción y Decisiones`,
      description: `Mapa de alto nivel orquestando ramificaciones, compuertas y bucles de interacción en ${cleanPName}.`,
      elements: ['Inicio', 'DecisionAuth', 'ProcesoPrincipal', 'DecisionError', 'Exito', 'Fin'],
      mermaid: `flowchart TD
    Inicio([Inicio de Operación]) --> ValidarSesion{¿Sesión Válida?}
    ValidarSesion -- No --> RedirigirLogin["Redirigir a Pantalla de Autenticación"]
    RedirigirLogin --> Fin([Fin])
    ValidarSesion -- Sí --> CargarDatos["Cargar Datos de ${mainRole} y Permisos"]
    CargarDatos --> EjecutarAccion["Ejecutar Acción Solicitada en ${mainEntityName}"]
    EjecutarAccion --> ValidarExito{¿Operación Exitosa?}
    ValidarExito -- No --> ManejoError["Mostrar Mensaje de Error y Permitir Reintento"]
    ManejoError --> EjecutarAccion
    ValidarExito -- Sí --> SincronizarEstado["Actualizar Estado en Base de Datos y Caché"]
    SincronizarEstado --> NotificarUsuario["Confirmar Operación con Éxito"]
    NotificarUsuario --> Fin`
    }
  ]
}
