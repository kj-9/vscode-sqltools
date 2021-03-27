import { EXT_NAMESPACE } from '@sqltools/util/constants';
import { IConnection, MConnectionExplorer, ContextValue, IIcons } from '@sqltools/types';
import { getConnectionDescription, getConnectionId } from '@sqltools/util/connection';
import { TreeItemCollapsibleState, Uri, commands } from 'vscode';
import SidebarAbstractItem from './SidebarAbstractItem';
import SidebarItem from "./SidebarItem";
import get from 'lodash/get';
import { createLogger } from '@sqltools/log/src';
import PluginResourcesMap, { buildResouceKey } from '@sqltools/util/plugin-resources';

const log = createLogger('conn-explorer');

export default class SidebarConnection extends SidebarAbstractItem<SidebarItem> {
  parent = null;

  get contextValue() {
    return this.isConnected ? ContextValue.CONNECTED_CONNECTION : ContextValue.CONNECTION;
  }

  get description() {
    return getConnectionDescription(this.conn);
  }

  get isConnected() {
    return this.conn.isConnected;
  }
  get id() {
    return <string>this.getId();
  }
  get value() {
    return this.conn.database;
  }

  get metadata() {
    return <MConnectionExplorer.IChildItem>{
      label: this.label,
      type: this.contextValue
    };
  }
  get tooltip() {
    if (this.isActive)
      return `Active Connection - Queries will run for this connection`;
    return undefined;
  }

  async getChildren() {
    if (!this.isConnected) {
      await commands.executeCommand(`${EXT_NAMESPACE}.selectConnection`, this);
    }
    const items: MConnectionExplorer.IChildItem[] = await commands.executeCommand(`${EXT_NAMESPACE}.getChildrenForTreeItem`, {
      conn: this.conn,
      item: this.metadata,
    });
    return items.map(item => new SidebarItem(item, this));
  }

  public get command () {
    if (!this.isActive) {
      return {
        title: 'Connect',
        command: `${EXT_NAMESPACE}.selectConnection`,
        arguments: [this],
      };
    }
  }

  constructor(public conn: IConnection) {
    super(conn.name, conn.isConnected ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
  }
  get iconPath() {
    try {
      if (this.isActive) {
        return this.getIcon('active');
      }
      else if (this.contextValue === ContextValue.CONNECTED_CONNECTION) {
        return this.getIcon('connected');
      }
      return this.getIcon('disconnected');
    } catch (error) {
      log.error(error);
    }
  }
  getId() {
    return getConnectionId(this.conn);
  }

  get isActive() {
    return this.conn.isActive;
  }

  private getIcon = (type: 'active' | 'connected' | 'disconnected') => {
    if (get(this, ['conn', 'icons', type])) {
      return Uri.parse(this.conn.icons[type]);
    }

    const typeMap = {
      active: 'active',
      connected: 'default',
      disconnected: 'inactive',
    };

    return Uri.parse((PluginResourcesMap.get<IIcons>(buildResouceKey({type: 'driver', name: this.conn.driver, resource: 'icons' })) || {})[typeMap[type] as any || 'default']);
  }
}
