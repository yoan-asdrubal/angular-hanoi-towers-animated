import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Disk} from '../model/disk';
import {CdkDragDrop, transferArrayItem} from '@angular/cdk/drag-drop';
import {FormControl, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material';
import {animate, group, style, transition, trigger} from '@angular/animations';

export interface MoveData {
    name: string;
    data: any[];
}

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('slideInOut', [
            transition(':enter', [group([
                    animate('200ms ease-in-out', style({
                        visibility: 'visible'
                    })),
                    animate('200ms ease-in-out', style({
                        opacity: '1'
                    }))
                ]
            )])
        ])
    ]
})
export class GameComponent implements OnInit {

    diskFormControl = new FormControl('', Validators.required);
    timeToStep = new FormControl(1000, Validators.required);

    column1: Disk[] = [];
    column2: Disk[] = [];
    column3: Disk[] = [];
    move = 0;

    border = '1px solid red';

    baseWidth = 300;
    baseRate = 30;
    topWidth = 30;
    topRate = 3;
    height = 300;
    heightRate = 30;

    totalDisk = 2;
    winner = false;
    simulationSteps = [];

    delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    constructor(private _snackBar: MatSnackBar, private changeDef: ChangeDetectorRef) {
    }

    ngOnInit() {
        this.column1 = this.initGame(this.totalDisk);
        // this.column2 = this.initGame(3);
        // this.column3 = this.initGame(5);
    }

    initGame(diskCount: number) {
        const base = diskCount * this.baseRate > this.baseWidth ? this.baseWidth : diskCount * this.baseRate;
        const top = diskCount * this.topRate > this.topWidth ? this.topWidth : diskCount * this.topRate;
        const height = this.height / diskCount > this.heightRate ? this.heightRate : this.height / diskCount;
        const rate = (base - top) / diskCount;

        return Array(diskCount)
            .fill(1)
            .map((x, i) => ({width: base - i * rate, height, color: this.generateColor(), nivel: diskCount - i}))
            .reverse();
    }

    generateColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    drop(event: CdkDragDrop<Disk[]>) {
        if (event.previousContainer !== event.container) {
            if (event.previousIndex === 0) {
                if (event.container.data.length === 0 || event.container.data[0].nivel > event.previousContainer.data[0].nivel) {
                    transferArrayItem(event.previousContainer.data,
                        event.container.data,
                        0,
                        0);
                    this.move++;
                    this.checkWinner(event.container.data);
                }
            }
        }
    }

    create() {
        let diskCount = this.totalDisk;
        if (this.diskFormControl.valid) {
            diskCount = this.diskFormControl.value;
        }
        this.totalDisk = parseInt('' + diskCount);
        this.column1 = this.initGame(this.totalDisk);
        this.column2 = [];
        this.column3 = [];
        this.simulationSteps = [];
        this.winner = false;
        this.move = 0;
    }


    checkWinner(column: any[] = this.column3) {
        if (this.totalDisk === column.length) {
            this._snackBar.open('You Win!!!', '', {verticalPosition: 'top', duration: 3000});
            this.winner = true;
        } else {
            this.winner = false;
        }
    }

    simulateGame() {
        this.create();
        this.moverTorre(this.totalDisk,
            {name: 'column1', data: this.column1.slice()},
            {name: 'column3', data: this.column3.slice()},
            {name: 'column2', data: this.column2.slice()});
        this.animateSimulation();
    }

    moverTorre(altura, origen: MoveData, destino: MoveData, intermedio: MoveData) {
        if (altura >= 1) {
            this.moverTorre(altura - 1, origen, intermedio, destino);
            this.moverDisco(origen, destino, intermedio);
            this.moverTorre(altura - 1, intermedio, destino, origen);
        }
    }

    moverDisco(desde: MoveData, hacia: MoveData, medio: MoveData) {

        hacia.data = [desde.data[0], ...hacia.data];
        desde.data.splice(0, 1);
        const step = {};
        step[desde.name] = desde.data.slice();
        step[hacia.name] = hacia.data.slice();
        step[medio.name] = medio.data.slice();

        this.simulationSteps.push(step);
        // console.log('mover hacia ', step);
    }

    animateSimulation() {
        setTimeout(() => {
            const {column1, column2, column3} = this.simulationSteps[0];
            this.simulationSteps.splice(0, 1);
            this.column1 = column1;
            this.column2 = column2;
            this.column3 = column3;
            this.move++;
            this.changeDef.markForCheck();

            if (this.simulationSteps.length > 0) {
                this.animateSimulation();
            } else {
                this.checkWinner();
            }
        }, this.timeToStep.value || 1000);
    }
}
