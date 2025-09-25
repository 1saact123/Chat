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

// Interface para User
export interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: Date;
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
  public lastLogin?: Date;
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
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'users',
  timestamps: true
});

// Los modelos ya están exportados arriba, no necesitamos re-exportarlos
