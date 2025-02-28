import { forwardRef } from "@angular/core";
import { Injectable } from "@angular/core";
import { Observable } from 'rxjs';

import { ResWebApiService } from './reswebapi.service';
import { Device } from '../../_models/device';
import { ProjectData, ProjectDataCmdType } from '../../_models/project';
import { AlarmQuery } from '../../_models/alarm';

@Injectable()
export abstract class ResourceStorageService {
    
    public static prjresource = 'prj-data';

    public abstract init(bridge?: any): boolean;

    public abstract onRefreshProject(): boolean;
    
    public abstract getDemoProject(): Observable<any>;
    
    public abstract getStorageProject(): Observable<any>;

    public abstract setServerProject(prj: ProjectData);

    public abstract setServerProjectData(cmd: ProjectDataCmdType, data: any, prj: ProjectData);
    
    public abstract getDeviceSecurity(id: string): Observable<any>;

    public abstract setDeviceSecurity(id: string, value: string): Observable<any>;

    public abstract getAlarmsValues(): Observable<any>;

    public abstract getAlarmsHistory(query: AlarmQuery): Observable<any>;
    
    public abstract setAlarmAck(name: string): Observable<any>;

    public abstract checkServer(): Observable<any>;

    public abstract getAppId(): string;
    
    public static defileProject(source: ProjectData): ProjectData {
        if (!source) return source;
        let destination = JSON.parse(JSON.stringify(source));
        let devices = {};
        for (let i = 0; i < destination.devices.length; i++) {
            let tags = {};
            for (let x = 0; x < destination.devices[i].tags.length; x++) {
                tags[destination.devices[i].tags[x].id] = destination.devices[i].tags[x];
            }
            destination.devices[i].tags = tags;
            devices[destination.devices[i].id] = destination.devices[i];
        }
        destination.devices = devices;
        return destination;
    }

    public static sanitizeProject(source: ProjectData): ProjectData {
        let destination = JSON.parse(JSON.stringify(source));
        destination.devices = Object.values(destination.devices);
        for (let i = 0; i < destination.devices.length; i++) {
            destination.devices[i].tags = Object.values(destination.devices[i].tags);
            for (let x = 0; x < destination.devices[i].tags.length; x++) {
                delete destination.devices[i].tags[x].value;
            }
        }
        return destination;
    }

    public static sanitizeDevice(source: Device) {
        let destination = JSON.parse(JSON.stringify(source));
        destination.tags = Object.values(destination.tags);
        return destination;
    }
}