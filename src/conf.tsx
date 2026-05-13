import { EnvVarDefinition } from './types';

export const CONF_PARAMS: Record<string, EnvVarDefinition> = {

    COT_URL: {
        type: 'url',
        description: 'URL of the CoT destination, typically Mesh SA or TAK Server',
        defaultValue: 'udp+wo://239.2.3.1:6969',
        validation: /^(udp\+wo|http|https|udp|tcp|tls|file|log|tcp\+wo|udp\+broadcast):\/\/[^\s]+$/,
        requiresQuoting: false,
        required: true,
    },

    LOG_LEVEL: {
        type: 'enum',
        description: 'Logging level',
        defaultValue: 'INFO',
        options: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
        validation: /^(DEBUG|INFO|WARN|ERROR)$/i,
        required: false,
    },

    LISTEN_PORT: {
        type: 'number',
        description: '(OTA) AIS UDP Listen Port, for use with Over-the-air (RF) AIS decoders',
        defaultValue: '5050',
        validation: /^\d{1,5}$/,
        range: [1, 65535],
        required: false,
    },

    LISTEN_HOST: {
        type: 'string',
        description: '(OTA) IP address to bind to for listening to AIS messages',
        defaultValue: '0.0.0.0',
        validation: /^(\d{1,3}\.){3}\d{1,3}$/,
        requiresQuoting: false,
        required: false,
    },

    FEED_URL: {
        type: 'url',
        description: '(Online) URL of the AIS feed from an AIS aggregator',
        defaultValue: '',
        validation: /^(https?|file):\/\/[^\s]+$/i,
        requiresQuoting: false,
        required: false,
    },

    POLL_INTERVAL: {
        type: 'number',
        description: '(Online) Interval in seconds to poll for new AIS messages from AIS aggregators',
        defaultValue: '61',
        validation: /^\d+$/,
        range: [1, 3600],
        required: false,
    },

    KNOWN_CRAFT: {
        type: 'path',
        description: 'CSV-style hints file for overriding callsign, icon, COT Type, etc',
        defaultValue: '',
        validation: /^(?:|[/][\w./-]*)$/,
        requiresQuoting: false,
        required: false,
    },

    INCLUDE_ALL_CRAFT: {
        type: 'boolean',
        description: 'If KNOWN_CRAFT is set, include all craft in the CoT, even those not in the KNOWN_CRAFT file.',
        defaultValue: 'true',
        validation: /^(true|false|yes|no|1|0)$/i,
        required: false,
    },

    IGNORE_ATON: {
        type: 'boolean',
        description: 'Ignore AIS from Aids to Navigation (buoys, etc). This is useful if you only want to see ships.',
        defaultValue: 'false',
        validation: /^(true|false|yes|no|1|0)$/i,
        required: false,
    },

    MID_DB_FILE: {
        type: 'path',
        description: 'Path to the MID database file, used for decoding AIS messages',
        defaultValue: '/var/lib/aiscot/mid.db',
        validation: /^(?:|[/][\w./-]*)$/,
        requiresQuoting: false,
        required: false,
    },

    SHIP_DB_FILE: {
        type: 'path',
        description: 'Path to the Ship database file, used for decoding AIS messages',
        defaultValue: '/var/lib/aiscot/ship.db',
        validation: /^(?:|[/][\w./-]*)$/,
        requiresQuoting: false,
        required: false,
    },

    EXTRA_ARGS: {
        type: 'string',
        description: 'Additional command line arguments (NOT IMPLEMENTED YET)',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },

    PYTAK_TLS_CLIENT_CERT: {
        type: 'path',
        description: 'Path to the TLS client certificate file, if required',
        defaultValue: '',
        validation: /^(?:|[/][\w./-]*)$/,
        requiresQuoting: false,
        required: false,
    },

    PYTAK_TLS_CLIENT_KEY: {
        type: 'path',
        description: 'Path to the TLS client key file, if required',
        defaultValue: '',
        validation: /^(?:|[/][\w./-]*)$/,
        requiresQuoting: false,
        required: false,
    },

    PYTAK_TLS_CLIENT_PASSWORD: {
        type: 'string',
        description: 'Password for the TLS client certificate, if required',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },

    PYTAK_TLS_CLIENT_CAFILE: {
        type: 'path',
        description: 'Path to the CA file for TLS connections, if required',
        defaultValue: '',
        validation: /^(?:|[/][\w./-]*)$/,
        requiresQuoting: false,
        required: false,
    },

    PYTAK_TLS_CLIENT_CIPHERS: {
        type: 'string',
        description: 'Ciphers to use for TLS connections, if required',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },

    PYTAK_TLS_DONT_CHECK_HOSTNAME: {
        type: 'boolean',
        description: 'Disable hostname verification for TLS connections',
        defaultValue: 'false',
        validation: /^(true|false|yes|no|1|0)$/i,
        required: false,
    },
    PYTAK_TLS_DONT_VERIFY: {
        type: 'boolean',
        description: 'Disable TLS certificate verification',
        defaultValue: 'false',
        validation: /^(true|false|yes|no|1|0)$/i,
        required: false,
    },
    PYTAK_TLS_SERVER_EXPECTED_HOSTNAME: {
        type: 'string',
        description: 'Expected hostname for the TLS server, used for verification',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },
    PYTAK_TLS_CERT_ENROLLMENT_USERNAME: {
        type: 'string',
        description: 'Username for TLS certificate enrollment',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },
    PYTAK_TLS_CERT_ENROLLMENT_PASSWORD: {
        type: 'string',
        description: 'Password for TLS certificate enrollment',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },
    PYTAK_TLS_CERT_ENROLLMENT_PASSPHRASE: {
        type: 'string',
        description: 'Passphrase for the TLS certificate enrollment, if required',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },

    COT_ACCESS: {
        type: 'enum',
        description: 'CoT Access level for the messages',
        defaultValue: 'public',
        options: ['public', 'restricted', 'private'],
        validation: /^(public|restricted|private)$/i,
        required: false,
    },

    COT_STALE: {
        type: 'number',
        description: 'CoT Stale period ("timeout"), in seconds',
        defaultValue: '3600',
        validation: /^\d+$/,
        required: false,
    },

    COT_TYPE: {
        type: 'string',
        description: 'Override COT Event Type ("marker type")',
        defaultValue: 'a-u-S-X-M',
        validation: /^[a-zA-Z0-9\-_]*$/,
        requiresQuoting: false,
        required: false,
    },

    COT_ICON: {
        type: 'string',
        description: 'Set a custom user icon / custom marker icon in TAK. Contains a Data Package UUID and resource name (file name)',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },

    COT_CAVEAT: {
        type: 'string',
        description: 'CoT Caveat for the messages, used to indicate special conditions',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },

    COT_RELTO: {
        type: 'string',
        description: 'CoT RelTo attribute, used to specify the relationship to other messages',
        defaultValue: '',
        requiresQuoting: false,
        required: false,
    },

    COT_QOS: {
        type: 'enum',
        description: 'CoT Quality of Service level for the messages',
        defaultValue: 'standard',
        options: ['standard', 'high', 'low'],
        validation: /^(standard|high|low)$/i,
        required: false,
    },

    COT_OPEX: {
        type: 'boolean',
        description: 'Indicates if the CoT message is for operational use',
        defaultValue: 'false',
        validation: /^(true|false|yes|no|1|0)$/i,
        required: false,
    },
};
