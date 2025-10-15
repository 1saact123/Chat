import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Interface para ChatThread
export interface ChatThreadAttributes {
  id?: number;
  threadId: string;
  openaiThreadId?: string;
  jiraIssueKey?: string;
  serviceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastActivity?: Date;
}

export interface ChatThreadCreationAttributes extends Optional<ChatThreadAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo ChatThread
export class ChatThread extends Model<ChatThreadAttributes, ChatThreadCreationAttributes> implements ChatThreadAttributes {
  public id!: number;
  public threadId!: string;
  public openaiThreadId?: string;
  public jiraIssueKey?: string;
  public serviceId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public lastActivity?: Date;
}

ChatThread.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  threadId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  openaiThreadId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  jiraIssueKey: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  serviceId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  lastActivity: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'chat_threads',
  timestamps: true
});

// Interface para ChatMessage
export interface ChatMessageAttributes {
  id?: number;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatMessageCreationAttributes extends Optional<ChatMessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo ChatMessage
export class ChatMessage extends Model<ChatMessageAttributes, ChatMessageCreationAttributes> implements ChatMessageAttributes {
  public id!: number;
  public threadId!: string;
  public role!: 'user' | 'assistant';
  public content!: string;
  public timestamp!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ChatMessage.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  threadId: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'chat_messages',
  timestamps: true
});

// Interface para ServiceConfiguration
export interface ServiceConfigurationAttributes {
  id?: number;
  serviceId: string;
  serviceName: string;
  assistantId: string;
  assistantName: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastUpdated?: Date;
}

export interface ServiceConfigurationCreationAttributes extends Optional<ServiceConfigurationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo ServiceConfiguration
export class ServiceConfiguration extends Model<ServiceConfigurationAttributes, ServiceConfigurationCreationAttributes> implements ServiceConfigurationAttributes {
  public id!: number;
  public serviceId!: string;
  public serviceName!: string;
  public assistantId!: string;
  public assistantName!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public lastUpdated?: Date;
}

ServiceConfiguration.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  serviceId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  serviceName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  assistantId: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  assistantName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'service_configurations',
  timestamps: true
});

// Interface para WebhookStats
export interface WebhookStatsAttributes {
  id?: number;
  date: Date;
  totalWebhooks: number;
  successfulResponses: number;
  failedResponses: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebhookStatsCreationAttributes extends Optional<WebhookStatsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo WebhookStats
export class WebhookStats extends Model<WebhookStatsAttributes, WebhookStatsCreationAttributes> implements WebhookStatsAttributes {
  public id!: number;
  public date!: Date;
  public totalWebhooks!: number;
  public successfulResponses!: number;
  public failedResponses!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WebhookStats.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  },
  totalWebhooks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  successfulResponses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  failedResponses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  sequelize,
  tableName: 'webhook_stats',
  timestamps: true
});

// Definir relaciones
ChatThread.hasMany(ChatMessage, { foreignKey: 'threadId', sourceKey: 'threadId' });
ChatMessage.belongsTo(ChatThread, { foreignKey: 'threadId', targetKey: 'threadId' });

// Interface para permisos específicos
export interface UserPermissions {
  serviceManagement: boolean;
  automaticAIDisableRules: boolean;
  webhookConfiguration: boolean;
  ticketControl: boolean;
  aiEnabledProjects: boolean;
  remoteServerIntegration: boolean;
}

// Interface para User
export interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  permissions?: UserPermissions;
  lastLogin?: Date;
  jiraToken?: string;
  jiraUrl?: string;
  openaiToken?: string;
  isInitialSetupComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo User
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'user';
  public isActive!: boolean;
  public permissions?: UserPermissions;
  public lastLogin?: Date;
  public jiraToken?: string;
  public openaiToken?: string;
  public isInitialSetupComplete?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: false,
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      serviceManagement: false,
      automaticAIDisableRules: false,
      webhookConfiguration: false,
      ticketControl: false,
      aiEnabledProjects: false,
      remoteServerIntegration: false
    }
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  jiraToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  jiraUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  openaiToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isInitialSetupComplete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  sequelize,
  tableName: 'users',
  timestamps: true
});

// Interface para SavedWebhook
export interface SavedWebhookAttributes {
  id?: number;
  userId?: number;
  name: string;
  url: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SavedWebhookCreationAttributes extends Optional<SavedWebhookAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo SavedWebhook
export class SavedWebhook extends Model<SavedWebhookAttributes, SavedWebhookCreationAttributes> implements SavedWebhookAttributes {
  public id!: number;
  public userId?: number;
  public name!: string;
  public url!: string;
  public description?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SavedWebhook.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  sequelize,
  tableName: 'saved_webhooks',
  timestamps: true
});

// Interface para UserConfiguration
export interface UserConfigurationAttributes {
  id?: number;
  userId: number;
  serviceId: string;
  serviceName: string;
  assistantId: string;
  assistantName: string;
  isActive: boolean;
  configuration?: any; // JSON para configuraciones específicas
  createdAt?: Date;
  updatedAt?: Date;
  lastUpdated?: Date;
}

export interface UserConfigurationCreationAttributes extends Optional<UserConfigurationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo UserConfiguration
export class UserConfiguration extends Model<UserConfigurationAttributes, UserConfigurationCreationAttributes> implements UserConfigurationAttributes {
  public id!: number;
  public userId!: number;
  public serviceId!: string;
  public serviceName!: string;
  public assistantId!: string;
  public assistantName!: string;
  public isActive!: boolean;
  public configuration?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public lastUpdated?: Date;
}

UserConfiguration.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  serviceId: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  serviceName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  assistantId: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  assistantName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  configuration: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'user_configurations',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'service_id']
    }
  ]
});

// Interface para UserWebhook
export interface UserWebhookAttributes {
  id?: number;
  userId: number;
  name: string;
  url: string;
  description?: string;
  isEnabled: boolean;
  filterEnabled: boolean;
  filterCondition?: string;
  filterValue?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserWebhookCreationAttributes extends Optional<UserWebhookAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo UserWebhook
export class UserWebhook extends Model<UserWebhookAttributes, UserWebhookCreationAttributes> implements UserWebhookAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public url!: string;
  public description?: string;
  public isEnabled!: boolean;
  public filterEnabled!: boolean;
  public filterCondition?: string;
  public filterValue?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Interface para UserDisabledTicket
export interface UserDisabledTicketAttributes {
  id?: number;
  userId: number;
  issueKey: string;
  reason?: string;
  disabledAt?: Date;
  disabledBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserDisabledTicketCreationAttributes extends Optional<UserDisabledTicketAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo UserDisabledTicket
export class UserDisabledTicket extends Model<UserDisabledTicketAttributes, UserDisabledTicketCreationAttributes> implements UserDisabledTicketAttributes {
  public id!: number;
  public userId!: number;
  public issueKey!: string;
  public reason?: string;
  public disabledAt?: Date;
  public disabledBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Interface para ServiceValidation
export interface ServiceValidationAttributes {
  id?: number;
  userId: number;
  serviceName: string;
  serviceDescription?: string;
  websiteUrl: string;
  requestedDomain: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  validatedBy?: number;
  validatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ServiceValidationCreationAttributes extends Optional<ServiceValidationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo ServiceValidation
export class ServiceValidation extends Model<ServiceValidationAttributes, ServiceValidationCreationAttributes> implements ServiceValidationAttributes {
  public id!: number;
  public userId!: number;
  public serviceName!: string;
  public serviceDescription?: string;
  public websiteUrl!: string;
  public requestedDomain!: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public adminNotes?: string;
  public validatedBy?: number;
  public validatedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserWebhook.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  filterEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  filterCondition: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  filterValue: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'user_webhooks',
  timestamps: true
});

UserDisabledTicket.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  issueKey: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  disabledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  disabledBy: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'user_disabled_tickets',
  timestamps: true
});

ServiceValidation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  serviceName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'service_name'
  },
  serviceDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'service_description'
  },
  websiteUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'website_url'
  },
  requestedDomain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'requested_domain'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
  },
  validatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'validated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'validated_at'
  }
}, {
  sequelize,
  tableName: 'service_validations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Interface para UserInstance
export interface UserInstanceAttributes {
  id?: number;
  userId: number;
  instanceName: string;
  instanceDescription?: string;
  isActive: boolean;
  settings?: any; // JSON para configuraciones específicas de la instancia
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserInstanceCreationAttributes extends Optional<UserInstanceAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Modelo UserInstance
export class UserInstance extends Model<UserInstanceAttributes, UserInstanceCreationAttributes> implements UserInstanceAttributes {
  public id!: number;
  public userId!: number;
  public instanceName!: string;
  public instanceDescription?: string;
  public isActive!: boolean;
  public settings?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserInstance.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  instanceName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  instanceDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'user_instances',
  timestamps: true
});

// Definir relaciones adicionales
User.hasMany(UserConfiguration, { foreignKey: 'userId' });
UserConfiguration.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserWebhook, { foreignKey: 'userId' });
UserWebhook.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserInstance, { foreignKey: 'userId' });
UserInstance.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(SavedWebhook, { foreignKey: 'userId' });
SavedWebhook.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserDisabledTicket, { foreignKey: 'userId' });
UserDisabledTicket.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ServiceValidation, { foreignKey: 'userId', as: 'serviceValidations' });
ServiceValidation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ServiceValidation, { foreignKey: 'validatedBy', as: 'validatedServices' });
ServiceValidation.belongsTo(User, { foreignKey: 'validatedBy', as: 'validator' });

// Los modelos ya están exportados arriba, no necesitamos re-exportarlos

// Exportar sequelize para scripts de migración
export { sequelize };
