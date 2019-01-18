import * as path from 'path';
import {
	DeclarationRule, Diagnostic, FileDefinitionRule, MemberRule, MethodRule, ParameterRule,
	ProfileComponent, ProfileComponentRule, PropertyRule, PslRule,
} from './api';
import { getConfig, matchConfig } from './config';

/**
 * Import rules here.
 */
import { ParsedDocument } from '../parser/parser';
import {
	MemberCamelCase, MemberLength, MemberLiteralCase,
	MemberStartsWithV, PropertyIsDummy, PropertyIsDuplicate,
} from './elementsConventionChecker';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from './methodDoc';
import { MultiLineDeclare } from './multiLineDeclare';
import { MethodParametersOnNewLine } from './parameters';
import { RuntimeStart } from './runtime';
import { TblColDocumentation } from './tblcolDoc';
import { TodoInfo } from './todos';

/**
 * Add new rules here to have them checked at the appropriate time.
 */
const componentRules: ProfileComponentRule[] = [];
const fileDefinitionRules: FileDefinitionRule[] = [
	new TblColDocumentation(),
];
const pslRules: PslRule[] = [
	new TodoInfo(),
];
const memberRules: MemberRule[] = [
	new MemberCamelCase(),
	new MemberLength(),
	new MemberStartsWithV(),
	new MemberLiteralCase(),
];
const methodRules: MethodRule[] = [
	new MethodDocumentation(),
	new MethodSeparator(),
	new MethodParametersOnNewLine(),
	new RuntimeStart(),
	new MultiLineDeclare(),
	new TwoEmptyLines(),
];
const propertyRules: PropertyRule[] = [
	new PropertyIsDummy(),
	new PropertyIsDuplicate(),
];
const declarationRules: DeclarationRule[] = [];
const parameterRules: ParameterRule[] = [];

export function getDiagnostics(
	profileComponent: ProfileComponent,
	parsedDocument?: ParsedDocument,
	useConfig?: boolean,
): Diagnostic[] {
	const subscription = new RuleSubscription(profileComponent, parsedDocument, useConfig);
	return subscription.reportRules();
}

/**
 * Interface for adding and executing rules.
 */
class RuleSubscription {

	private diagnostics: Diagnostic[];
	private componentRules: ProfileComponentRule[];
	private pslRules: PslRule[];
	private fileDefinitionRules: FileDefinitionRule[];
	private methodRules: MethodRule[];
	private memberRules: MemberRule[];
	private propertyRules: PropertyRule[];
	private declarationRules: DeclarationRule[];
	private parameterRules: ParameterRule[];

	constructor(private profileComponent: ProfileComponent, private parsedDocument?: ParsedDocument, useConfig?: boolean) {
		this.diagnostics = [];

		const config = useConfig ? getConfig(this.profileComponent.fsPath) : undefined;

		const initializeRules = (rules: ProfileComponentRule[]) => {
			return rules.filter(rule => {
				if (!config) return true;
				return matchConfig(path.basename(this.profileComponent.fsPath), rule.ruleName, config);
			}).map(rule => {
				rule.profileComponent = this.profileComponent;
				return rule;
			});
		};
		const initializePslRules = (rules: PslRule[]) => {
			const componentInitialized = initializeRules(rules) as PslRule[];
			const pslParsedDocument = this.parsedDocument as ParsedDocument;
			return componentInitialized.map(rule => {
				rule.parsedDocument = pslParsedDocument;
				return rule;
			});
		};

		this.componentRules = initializeRules(componentRules);
		this.fileDefinitionRules = initializeRules(fileDefinitionRules);
		this.pslRules = initializePslRules(pslRules);
		this.methodRules = initializePslRules(methodRules);
		this.memberRules = initializePslRules(memberRules);
		this.propertyRules = initializePslRules(propertyRules);
		this.declarationRules = initializePslRules(declarationRules);
		this.parameterRules = initializePslRules(parameterRules);
	}

	reportRules(): Diagnostic[] {
		const addDiagnostics = (rules: ProfileComponentRule[], ...args: any[]) => {
			rules.forEach(rule => this.diagnostics.push(...rule.report(...args)));
		};

		addDiagnostics(this.componentRules);

		if (ProfileComponent.isFileDefinition(this.profileComponent.fsPath)) {
			addDiagnostics(this.fileDefinitionRules);
		}

		if (ProfileComponent.isPsl(this.profileComponent.fsPath)) {
			addDiagnostics(this.pslRules);

			const parsedDocument = this.parsedDocument as ParsedDocument;

			for (const property of parsedDocument.properties) {
				addDiagnostics(this.memberRules, property);
				addDiagnostics(this.propertyRules, property);
			}

			for (const declaration of parsedDocument.declarations) {
				addDiagnostics(this.memberRules, declaration);
				addDiagnostics(this.declarationRules, declaration);
			}

			for (const method of parsedDocument.methods) {
				addDiagnostics(this.memberRules, method);
				addDiagnostics(this.methodRules, method);

				for (const parameter of method.parameters) {
					addDiagnostics(this.memberRules, parameter);
					addDiagnostics(this.parameterRules, parameter, method);
				}

				for (const declaration of method.declarations) {
					addDiagnostics(this.memberRules, declaration);
					addDiagnostics(this.declarationRules, declaration, method);
				}
			}

		}

		return this.diagnostics;
	}
}
