import * as path from 'path';
import {
	DeclarationRule, Diagnostic, MemberRule,
	MethodRule, ParameterRule, ProfileComponent, PropertyRule, PslRule,
} from './api';
import { getConfig, matchConfig } from './config';

/**
 * Import rules here.
 */
import { ParsedDocument } from '../parser/parser';
import {
	MemberCamelCase, MemberLength, MemberLiteralCase,
	MemberStartsWithV, PropertyIsDummy,
} from './elementsConventionChecker';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from './methodDoc';
import { MultiLineDeclare } from './multiLineDeclare';
import { MethodParametersOnNewLine } from './parameters';
import { RuntimeStart } from './runtime';
import { TodoInfo } from './todos';

/**
 * Add new rules here to have them checked at the appropriate time.
 */
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
	private initializedPslRules: PslRule[];
	private initializedMethodRules: MethodRule[];
	private initializedMemberRules: MemberRule[];
	private initializedPropertyRules: PropertyRule[];
	private initializedDeclarationRules: DeclarationRule[];
	private initializedParameterRules: ParameterRule[];

	constructor(private profileComponent: ProfileComponent, private parsedDocument?: ParsedDocument, useConfig?: boolean) {
		this.diagnostics = [];

		const config = useConfig ? getConfig(this.profileComponent.fsPath) : undefined;

		const initializeRules = (rules: PslRule[]) => {
			return rules.filter(rule => {
				if (!config) return true;
				return matchConfig(path.basename(this.profileComponent.fsPath), rule.ruleName, config);
			}).map(rule => {
				rule.profileComponent = this.profileComponent;
				if (this.parsedDocument) rule.parsedDocument = this.parsedDocument;
				return rule;
			});
		};

		this.initializedPslRules = initializeRules(pslRules);
		this.initializedMethodRules = initializeRules(methodRules);
		this.initializedMemberRules = initializeRules(memberRules);
		this.initializedPropertyRules = initializeRules(propertyRules);
		this.initializedDeclarationRules = initializeRules(declarationRules);
		this.initializedParameterRules = initializeRules(parameterRules);
	}

	reportRules(): Diagnostic[] {
		const addDiagnostics = (rules: PslRule[], ...args: any[]) => {
			rules.forEach(rule => this.diagnostics.push(...rule.report(...args)));
		};

		addDiagnostics(this.initializedPslRules);

		const parsedDocument = this.parsedDocument as ParsedDocument;

		for (const property of parsedDocument.properties) {
			addDiagnostics(this.initializedMemberRules, property);
			addDiagnostics(this.initializedPropertyRules, property);
		}

		for (const declaration of parsedDocument.declarations) {
			addDiagnostics(this.initializedMemberRules, declaration);
			addDiagnostics(this.initializedDeclarationRules, declaration);
		}

		for (const method of parsedDocument.methods) {
			addDiagnostics(this.initializedMemberRules, method);
			addDiagnostics(this.initializedMethodRules, method);

			for (const parameter of method.parameters) {
				addDiagnostics(this.initializedMemberRules, parameter);
				addDiagnostics(this.initializedParameterRules, parameter, method);
			}

			for (const declaration of method.declarations) {
				addDiagnostics(this.initializedMemberRules, declaration);
				addDiagnostics(this.initializedDeclarationRules, declaration, method);
			}
		}
		return this.diagnostics;
	}
}
