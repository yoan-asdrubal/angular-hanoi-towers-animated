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

    /** Valores para la cantidad de discos y el tiempo de la animacion */
    diskFormControl = new FormControl(8, Validators.required);
    timeToStep = new FormControl(300, Validators.required);

    /** Datos que estan en cada columna*/
    column1: Disk[] = [];
    column2: Disk[] = [];
    column3: Disk[] = [];

    /** Cantidad de movimientos pendientes */
    move = 0;

    /**  Ancho del disco mas grande    */
    baseWidth = 300;
    /** Proporcion de la diferencia de tamaño entre discos, por defecto 30 */
    baseRate = 30;
    /** Ancho del disco mas pequeño */
    topWidth = 30;
    topRate = 3;
    /** Alto de la columna */
    height = 300;
    /** Escala de crecimiento de los discos, por defecto 30*/
    heightRate = 30;

    /** Total de discos a utilizar, por defecto 8*/
    totalDisk = 8;
    /** Estado del problema*/
    winner = false;

    /** Historial de estados para utilizar en la simulacion de los pasos cuando lo resuelve la computadora*/
    simulationSteps = [];

    constructor(private _snackBar: MatSnackBar, private changeDef: ChangeDetectorRef) {
    }

    ngOnInit() {
        this.column1 = this.initGame(this.totalDisk);
    }

    /**
     *Crea un nuevo juego, con la cantidad de discos especificadas
     * Determina el ancho de la base, el ancho del ultimo disco, el alto de la columna segun la cantidad de discos,
     * y la escala a utilizar para calcular la diferencia de tamaño entre discos
     * @param diskCount
     */
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

    /**
     * Genera un color aleatoro en hexadecimal
     */
    generateColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    /**
     * Maneja el evento en el Drag and Drop cuando se mueve un disco por el usuario, realiza las validaciones
     * antes de realizar el movimiento
     * @param event
     */
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

    /**
     * Crea un juego utilizando la cantidad de discos especificadas en el campo para ello, o en caso de que no
     * exista utiliza la ultima cantidad de discos utilizada.
     */
    create() {
        let diskCount = this.totalDisk;
        if (this.diskFormControl.valid) {
            diskCount = this.diskFormControl.value;
        }
        this.totalDisk = parseInt(diskCount.toString());
        this.column1 = this.initGame(this.totalDisk);
        this.column2 = [];
        this.column3 = [];
        this.simulationSteps = [];
        this.winner = false;
        this.move = 0;
    }

    /**
     * Chequea si se ha resuelto el algoritmo correctamente
     * @param column
     */
    checkWinner(column: any[] = this.column3) {
        if (this.totalDisk === column.length) {
            this._snackBar.open('You Win!!!', '', {verticalPosition: 'top', duration: 3000});
            this.winner = true;
        } else {
            this.winner = false;
        }
    }

    /**
     * Resuelve automaticamente un caso del algoritmo, para ello lo crea nuevamente, determina la solucion
     * correspondiente y luego anima la solucion segun el historial de pasos almacenados  en el proceso
     */
    simulateGame() {
        this.create();
        this.moverTorre(this.totalDisk,
            {name: 'column1', data: this.column1.slice()},
            {name: 'column3', data: this.column3.slice()},
            {name: 'column2', data: this.column2.slice()});
        this.animateSimulation();
    }

    /** Mueve los discos de la torre origen a la torre destino */
    moverTorre(altura, origen: MoveData, destino: MoveData, intermedio: MoveData) {
        if (altura >= 1) {
            this.moverTorre(altura - 1, origen, intermedio, destino);
            this.moverDisco(origen, destino, intermedio);
            this.moverTorre(altura - 1, intermedio, destino, origen);
        }
    }

    /** Mueve un disco de una torre a otra, guarda el estado de las torres en el historial de pasos
     * para luego utilizarlo en la animacion
     * */
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

    /**
     * Realiza la animacion de un paso, y recursivamente mientras queden pasos pendientes
     * en el historial anima los restantes
     */
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
