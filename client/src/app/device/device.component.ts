import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material';
import { Subscription } from "rxjs";
import { MatTable, MatTableDataSource, MatPaginator, MatSort, MatMenuTrigger } from '@angular/material';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';

import { DeviceListComponent } from './device-list/device-list.component';
import { DeviceMapComponent } from './device-map/device-map.component';
import { Device, Tag } from './../_models/device';
import { ProjectService, SaveMode } from '../_services/project.service';
import { HmiService } from '../_services/hmi.service';
import { DEVICE_READONLY } from '../_models/hmi';

@Component({
    selector: 'app-device',
    templateUrl: './device.component.html',
    styleUrls: ['./device.component.css']
})
export class DeviceComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild('devicelist') deviceList: DeviceListComponent;
    @ViewChild('devicemap') deviceMap: DeviceMapComponent;
    @ViewChild('fileImportInput') fileImportInput: any;

    private subscriptionLoad: Subscription;
    private subscriptionDeviceChange: Subscription;
    private subscriptionVariableChange: Subscription;
    private subscriptionSave: Subscription;
    private askStatusTimer;
    showMode: string = 'map';
    readonly = false;
    reloadActive = false;

    constructor(private router: Router,
        private projectService: ProjectService,
        private hmiService: HmiService) {
        if (this.router.url.indexOf(DEVICE_READONLY) >= 0) {
            this.readonly = true;
        }
    }

    ngOnInit() {
        this.subscriptionLoad = this.projectService.onLoadHmi.subscribe(res => {
            this.deviceMap.loadCurrentProject();
            this.deviceList.mapTags();
        });
        this.subscriptionDeviceChange = this.hmiService.onDeviceChanged.subscribe(event => {
            this.deviceMap.setDeviceStatus(event);
        });
        this.subscriptionVariableChange = this.hmiService.onVariableChanged.subscribe(event => {
            this.deviceList.updateDeviceValue();
        });
        this.subscriptionSave = this.projectService.onSaveCurrent.subscribe((mode: SaveMode) => {
            if (mode === SaveMode.SaveAs) {
                this.projectService.saveAs();
            } else if (mode === SaveMode.Save) {
                this.projectService.save();
            }
        });
        this.askStatusTimer = setInterval(() => {
            this.hmiService.askDeviceStatus();
        }, 10000);
        this.hmiService.askDeviceStatus();
    }

    ngAfterViewInit() {
        this.showMode = 'map';
    }

    ngOnDestroy() {
        // this.checkToSave();
        try {
            if (this.subscriptionLoad) {
                this.subscriptionLoad.unsubscribe();
            }
            if (this.subscriptionDeviceChange) {
                this.subscriptionDeviceChange.unsubscribe();
            }
            if (this.subscriptionVariableChange) {
                this.subscriptionVariableChange.unsubscribe();
            }
            if (this.subscriptionSave) {
                this.subscriptionSave.unsubscribe();
            }
        } catch (e) {
        }
        try {
            clearInterval(this.askStatusTimer);
            this.askStatusTimer = null;
        } catch { }
    }

    show(mode: string) {
        // this.checkToSave();
        this.showMode = mode;
        if (this.showMode === 'tags') {
            this.deviceList.updateDeviceValue();
            try {
                if (Object.values(this.deviceMap.devicesValue()).length > 0) {
                    this.deviceList.setSelectedDevice(this.deviceMap.devicesValue()[0]);
                }
            } catch (e) {
            }
        }
    }

    gotoMap() {
        this.show('map');
    }

    gotoList(device: Device) {
        this.show('tags');
        this.deviceList.setSelectedDevice(device);
    }

    addItem() {
        if (this.showMode === 'tags') {
            this.deviceList.onAddTag();
        } else if (this.showMode === 'map') {
            this.deviceMap.addDevice();
        }
    }

    onReload() {
        this.projectService.onRefreshProject();
        this.reloadActive = true;
        setTimeout(() => {
            this.reloadActive = false;
        }, 1000);
    }

    onExport() {
        try {
            this.projectService.exportDevices();
        } catch (err) {
            console.error(err);
        }
    }

    onImport() {
        let ele = document.getElementById('devicesConfigFileUpload') as HTMLElement;
        ele.click();
    }

    /**
     * open Project event file loaded 
     * @param event file resource
     */
    onFileChangeListener(event) {
        let files = event.srcElement.files;
        let input = event.target;
        let reader = new FileReader();
        reader.onload = (data) => {
            let devices = JSON.parse(reader.result.toString());
            this.projectService.importDevices(devices);
            this.projectService.onRefreshProject();
        }

        reader.onerror = function () {
            let msg = 'Unable to read ' + input.files[0];
            // this.translateService.get('msg.project-load-error', {value: input.files[0]}).subscribe((txt: string) => { msg = txt });
            alert(msg);
        };
        reader.readAsText(input.files[0]);
        this.fileImportInput.nativeElement.value = null;
    }
}

@Component({
    selector: 'device-tag-dialog',
    templateUrl: './device-tag.dialog.html',
    styleUrls: ['./device.component.css']
})
export class DeviceTagDialog implements OnInit {

    @ViewChild(MatTable) table: MatTable<any>;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatPaginator) paginator: MatPaginator;

    dataSource = new MatTableDataSource([]);
    nameFilter = new FormControl();
    addressFilter = new FormControl();
    deviceFilter = new FormControl();
    tags: TagElement[] = [];

    filteredValues = {
        name: '', address: '', device: ''
    };

    readonly defColumns = ['toogle', 'name', 'address', 'device', 'select'];

    constructor(public dialogRef: MatDialogRef<DeviceTagDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (this.data.devices) {
            this.data.devices.forEach((device: Device) => {
                if (device.tags) {
                    Object.values(device.tags).forEach((t: Tag) => this.tags.push(<TagElement>{
                        id: t.id, name: t.name, address: t.address,
                        device: device.name, checked: (t.id === this.data.variableId), error: null
                    }));
                }
            }
            )
        }
        this.dataSource = new MatTableDataSource(this.tags);
    }

    ngOnInit() {

        this.nameFilter.valueChanges.subscribe((nameFilterValue) => {
            this.filteredValues['name'] = nameFilterValue;
            this.dataSource.filter = JSON.stringify(this.filteredValues);
        });

        this.addressFilter.valueChanges.subscribe((addressFilterValue) => {
            this.filteredValues['address'] = addressFilterValue;
            this.dataSource.filter = JSON.stringify(this.filteredValues);
        });

        this.deviceFilter.valueChanges.subscribe((deviceFilterValue) => {
            this.filteredValues['device'] = deviceFilterValue;
            this.dataSource.filter = JSON.stringify(this.filteredValues);
        });
        this.dataSource.filterPredicate = this.customFilterPredicate();
    }

    customFilterPredicate() {
        const myFilterPredicate = (data: TagElement, filter: string): boolean => {
            let searchString = JSON.parse(filter);
            return (!data.name || data.name.toString().trim().toLowerCase().indexOf(searchString.name.toLowerCase()) !== -1) &&
                (!data.address || data.address.toString().trim().toLowerCase().indexOf(searchString.address.toLowerCase()) !== -1) &&
                data.device.toString().trim().toLowerCase().indexOf(searchString.device.toLowerCase()) !== -1;
        }
        return myFilterPredicate;
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        // this.dataSource.data = this.data.tags;
    }

    onToogle(element: TagElement) {
        if (element.checked) {
            this.dataSource.data.forEach(e => {
                if (e.id !== element.id) {
                    e.checked = false;
                }
            });
        }
    }

    onClearSelection() {
        this.dataSource.data.forEach(e => {
            e.checked = false;
        });
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onOkClick(): void {
        this.data.variableId = null;
        this.dataSource.data.forEach(e => {
            if (e.checked) {
                this.data.variableId = e.id;
            }
        });
        this.dialogRef.close(this.data);
    }

    onSelect(element: TagElement) {
        this.data.variableId = element.id;
        this.dialogRef.close(this.data);
    }
}

export interface TagElement {
    id: string;
    name: string;
    address: string;
    device: string;
    checked: boolean;
    error: string;
}