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
    discoFormControl = new FormControl(8, Validators.required);
    tiempoAnimacionFormControl = new FormControl(300, Validators.required);

    /** Datos que estan en cada columna*/
    columna1: Disk[] = [];
    columna2: Disk[] = [];
    columna3: Disk[] = [];

    /** Cantidad de movimientos pendientes */
    movimientos = 0;

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
    totalDiscos = 8;
    /** Estado del problema*/
    ganador = false;

    /** Historial de estados para utilizar en la simulacion de los pasos cuando lo resuelve la computadora*/
    pasosSimulacion = [];

    constructor(private _snackBar: MatSnackBar, private changeDef: ChangeDetectorRef) {
    }

    ngOnInit() {
        this.columna1 = this.iniciarJuego(this.totalDiscos);
    }

    /**
     *Crea un nuevo juego, con la cantidad de discos especificadas
     * Determina el ancho de la base, el ancho del ultimo disco, el alto de la columna segun la cantidad de discos,
     * y la escala a utilizar para calcular la diferencia de tamaño entre discos
     * @param diskCount
     */
    iniciarJuego(diskCount: number) {
        const base = diskCount * this.baseRate > this.baseWidth ? this.baseWidth : diskCount * this.baseRate;
        const top = diskCount * this.topRate > this.topWidth ? this.topWidth : diskCount * this.topRate;
        const height = this.height / diskCount > this.heightRate ? this.heightRate : this.height / diskCount;
        const rate = (base - top) / diskCount;

        return Array(diskCount)
            .fill(1)
            .map((x, i) => ({width: base - i * rate, height, color: this.generarColor(), nivel: diskCount - i}))
            .reverse();
    }

    /**
     * Genera un color aleatoro en hexadecimal
     */
    generarColor() {
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
                    this.movimientos++;
                    this.chequeaGanador(event.container.data);
                }
            }
        }
    }

    /**
     * Crea un juego utilizando la cantidad de discos especificadas en el campo para ello, o en caso de que no
     * exista utiliza la ultima cantidad de discos utilizada.
     */
    crear() {
        let diskCount = this.totalDiscos;
        if (this.discoFormControl.valid) {
            diskCount = this.discoFormControl.value;
        }
        this.totalDiscos = parseInt(diskCount.toString());
        this.columna1 = this.iniciarJuego(this.totalDiscos);
        this.columna2 = [];
        this.columna3 = [];
        this.pasosSimulacion = [];
        this.ganador = false;
        this.movimientos = 0;
    }

    /**
     * Chequea si se ha resuelto el algoritmo correctamente
     * @param column
     */
    chequeaGanador(column: any[] = this.columna3) {
        if (this.totalDiscos === column.length) {
            this._snackBar.open('You Win!!!', '', {verticalPosition: 'top', duration: 3000});
            this.ganador = true;
        } else {
            this.ganador = false;
        }
    }

    /**
     * Resuelve automaticamente un caso del algoritmo, para ello lo crea nuevamente, determina la solucion
     * correspondiente y luego anima la solucion segun el historial de pasos almacenados  en el proceso
     */
    resolverJuego() {
        this.crear();
        this.moverTorre(this.totalDiscos,
            {name: 'columna1', data: this.columna1.slice()},
            {name: 'columna3', data: this.columna3.slice()},
            {name: 'columna2', data: this.columna2.slice()});
        this.animarSolucion();
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

        this.pasosSimulacion.push(step);
        // console.log('mover hacia ', step);
    }

    /**
     * Realiza la animacion de un paso, y recursivamente mientras queden pasos pendientes
     * en el historial anima los restantes
     */
    animarSolucion() {
        setTimeout(() => {
            const {columna1, columna2, columna3} = this.pasosSimulacion[0];
            this.pasosSimulacion.splice(0, 1);
            this.columna1 = columna1;
            this.columna2 = columna2;
            this.columna3 = columna3;
            this.movimientos++;
            this.changeDef.markForCheck();

            if (this.pasosSimulacion.length > 0) {
                this.animarSolucion();
            } else {
                this.chequeaGanador();
            }
        }, this.tiempoAnimacionFormControl.value || 1000);
    }
}
