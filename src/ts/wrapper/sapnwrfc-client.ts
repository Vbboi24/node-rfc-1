/// <reference types="node" />

import * as Promise from 'bluebird';
const binary = require('node-pre-gyp');
const path = require('path');
const binding_path = binary.find(path.resolve(path.join(__dirname, '../../package.json')));
console.log('::', binding_path);

let binding: RfcClientBinding;
try {
	binding = require(binding_path);
} catch (ex) {
	let errorMessage = `\nnode-rfc module not found: ${binding_path}\nor\nSAP NW RFC shared library not found.`;
	if (process.platform === 'win32') {
		errorMessage += ' Check if on %PATH%';
	} else {
		errorMessage += ' Check "ldconfig -p | grep sap"';
	}
	errorMessage += ' and check SAP NW RFC SDK installation guides.\n';
	throw new Error(errorMessage);
}
interface RfcConnectionInfo {
	host: string;
	partnerHost: string;
	sysNumber: string;
	sysId: string;
	client: string;
	user: string;
	language: string;
	trace: string;
	isoLanguage: string;
	codepage: string;
	partnerCodepage: string;
	rfcRole: string;
	type: string;
	partnerType: string;
	rel: string;
	partnerRel: string;
	kernelRel: string;
	cpicConvId: string;
	progName: string;
	partnerBytesPerChar: string;
	reserved: string;
}

interface RfcClientVersion {
	major: string;
	minor: string;
	patch: string;
	binding: string;
}

interface RfcClientInstance {
	new (connectionParameters: RfcConnectionParameters): RfcClientInstance;
	(connectionParameters: RfcConnectionParameters): RfcClientInstance;
	connectionInfo(): RfcConnectionInfo;
	connect(callback: Function): any;
	invoke(rfmName: string, rfmParams: RfcObject, callback: Function, callOptions?: object): any;
	ping(callback: Function | undefined): void | Promise<void>;
	close(callback: Function | undefined): void | Promise<void>;
	reopen(callback: Function | undefined): void | Promise<void>;
	isAlive(): boolean;
	id: number;
	version: RfcClientVersion;
}

interface RfcClientBinding {
	Client: RfcClientInstance;
	getVersion(): object;
	verbose(): this;
}

enum EnumSncQop {
	DigSig = '1',
	DigSigEnc = '2',
	DigSigEncUserAuth = '3',
	BackendDefault = '8',
	Maximum = '9',
}

enum EnumTrace {
	Off = '0',
	Brief = '1',
	Verbose = '2',
	Full = '3',
}

export interface RfcCallOptions {
	notRequested?: Array<String>;
	timeout?: number;
}

export interface RfcConnectionParameters {
	// general
	saprouter?: string;
	snc_lib?: string;
	snc_myname?: string;
	snc_partnername?: string;
	snc_qop?: EnumSncQop;
	trace?: EnumTrace;
	// not supported
	// pcs
	// codepage
	// noCompression

	// client
	user?: string;
	passwd?: string;
	client: string;
	lang?: string;
	mysapsso2?: string;
	getsso2?: string;
	x509cert?: string;

	//
	// destination
	//

	// specific server
	dest?: string;
	ashost?: string;
	sysnr?: string;
	gwhost?: string;
	gwserv?: string;

	// load balancing
	//dest?: string,
	group?: string;
	r3name?: string;
	sysid?: string;
	mshost?: string;
	msserv?: string;

	// gateway
	//dest?: string,
	tpname?: string;
	program_id?: string;
	//gwhost?: string,
	//gwserv?: string,
}

export type RfcVariable = string | number | Buffer;
export type RfcArray = Array<RfcVariable>;
export type RfcStructure = { [key: string]: RfcVariable | RfcStructure | RfcTable };
export type RfcTable = Array<RfcStructure>;
export type RfcParameterValue = RfcVariable | RfcArray | RfcStructure | RfcTable;
export type RfcObject = { [key: string]: RfcParameterValue };

export class Client {
	private __client: RfcClientInstance;

	constructor(connectionParams: RfcConnectionParameters) {
		this.__client = new binding.Client(connectionParams);
	}

	open(): Promise<Client> {
		return new Promise((resolve, reject) => {
			try {
				this.__client.connect((err: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(this);
					}
				});
			} catch (ex) {
				reject(ex);
			}
		});
	}

	call(rfmName: string, rfmParams: RfcObject, callOptions: RfcCallOptions = {}): Promise<RfcObject> {
		return new Promise((resolve, reject) => {
			if (arguments.length < 2) {
				reject(new TypeError('Please provide remote function module name and parameters as arguments'));
			}

			if (typeof rfmName !== 'string') {
				reject(new TypeError('First argument (remote function module name) must be an string'));
			}

			if (typeof rfmParams !== 'object') {
				reject(new TypeError('Second argument (remote function module parameters) must be an object'));
			}

			if (arguments.length === 3 && typeof callOptions !== 'object') {
				reject(new TypeError('Call options argument must be an object'));
			}

			try {
				this.__client.invoke(
					rfmName,
					rfmParams,
					(err: any, res: RfcObject) => {
						if (err) {
							reject(err);
						} else {
							resolve(res);
						}
					},
					callOptions
				);
			} catch (ex) {
				reject(ex);
			}
		});
	}

	connect(callback: Function) {
		this.__client.connect(callback);
	}

	invoke(rfmName: string, rfmParams: RfcObject, callback: Function, callOptions?: object) {
		try {
			if (typeof callback !== 'function') {
				throw new TypeError('Callback function must be supplied');
			}

			if (arguments.length < 3) {
				callback(new TypeError('Please provide rfc module name, parameters and callback as arguments'));
				return;
			}

			if (typeof rfmName !== 'string') {
				callback(new TypeError('First argument (remote function module name) must be an string'));
				return;
			}

			if (typeof rfmParams !== 'object') {
				callback(new TypeError('Second argument (remote function module parameters) must be an object'));
				return;
			}

			if (arguments.length === 4 && typeof callOptions !== 'object') {
				callback(new TypeError('Call options argument must be an object'));
				return;
			}

			this.__client.invoke(rfmName, rfmParams, callback, callOptions);
		} catch (ex) {
			if (typeof callback !== 'function') {
				throw ex;
			} else {
				callback(ex);
			}
		}
	}

	close(callback: Function | undefined) {
		if (typeof callback === 'function') {
			return this.__client.close(callback);
		} else {
			return new Promise((resolve, reject) => {
				this.__client.close((err: any) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		}
	}

	reopen(callback: Function | undefined) {
		if (typeof callback === 'function') {
			return this.__client.reopen(callback);
		} else {
			return new Promise((resolve, reject) => {
				this.__client.reopen((err: any) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		}
	}

	ping(callback: Function | undefined) {
		if (typeof callback === 'function') {
			return this.__client.ping(callback);
		} else {
			return new Promise((resolve, reject) => {
				this.__client.ping((err: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(true);
					}
				});
			});
		}
	}

	get isAlive(): boolean {
		return this.__client.isAlive();
	}

	get id(): number {
		return this.__client.id;
	}

	get version(): RfcClientVersion {
		return this.__client.version;
	}

	get connectionInfo(): RfcConnectionInfo {
		return this.__client.connectionInfo();
	}
}
