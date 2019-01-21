import * as path from 'path';
import { ParsedDocument } from '../parser/parser';
import {
	DeclarationRule, DeclarationRuleConstructor, Diagnostic, FileDefinitionRule, FileDefinitionRuleConstructor,
	MemberRule, MemberRuleConstructor, MethodRule, MethodRuleConstructor, ParameterRule, ParameterRuleConstructor,
	ProfileComponent, ProfileComponentRule, ProfileComponentRuleConstructor, PropertyRule, PropertyRuleConstructor,
	PslRule, PslRuleConstructor,
} from './api';
import { getConfig, matchConfig } from './config';
import {
	MemberCamelCase, MemberLength, MemberLiteralCase,
	MemberStartsWithV, PropertyIsDummy,
} from './elementsConventionChecker';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from './methodDoc';
import { MultiLineDeclare } from './multiLineDeclare';
import { MethodParametersOnNewLine } from './parameters';
import { RuntimeStart } from './runtime';
import { TblColDocumentation } from './tblcolDoc';
import { TodoInfo } from './todos';

const componentRuleConstructors: ProfileComponentRuleConstructor[] = [];
const fileDefinitionRuleConstructors: FileDefinitionRuleConstructor[] = [
	TblColDocumentation,
];
const pslRuleConstructors: PslRuleConstructor[] = [
	TodoInfo,
];
const memberRuleConstructors: MemberRuleConstructor[] = [
	MemberCamelCase,
	MemberLength,
	MemberStartsWithV,
	MemberLiteralCase,
];
const methodRuleConstructors: MethodRuleConstructor[] = [
	MethodDocumentation,
	MethodSeparator,
	MethodParametersOnNewLine,
	RuntimeStart,
	MultiLineDeclare,
	TwoEmptyLines,
];
const propertyRuleConstructors: PropertyRuleConstructor[] = [
	PropertyIsDummy,
];
const declarationRuleConstructors: DeclarationRuleConstructor[] = [];
const parameterRuleConstructors: ParameterRuleConstructor[] = [];

export function getDiagnostics(
	profileComponent: ProfileComponent,
	parsedDocument?: ParsedDocument,
	useConfig?: boolean,
): Diagnostic[] {
	const subscription = new RuleSubscription(profileComponent, parsedDocument, useConfig);
	return subscription.reportRules();
}

/**
 * Manages which rules need to be applied to a given component.
 */
class RuleSubscription {

	private componentRules: ProfileComponentRule[];
	private pslRules: PslRule[];
	private fileDefinitionRules: FileDefinitionRule[];
	private methodRules: MethodRule[];
	private memberRules: MemberRule[];
	private propertyRules: PropertyRule[];
	private declarationRules: DeclarationRule[];
	private parameterRules: ParameterRule[];

	constructor(private profileComponent: ProfileComponent, private parsedDocument?: ParsedDocument, useConfig?: boolean) {
		const config = useConfig ? getConfig(this.profileComponent.fsPath) : undefined;

		const filterRule = (ruleCtor: ProfileComponentRuleConstructor | PslRuleConstructor) => {
			if (!useConfig) return true;
			if (!config) return false;
			return matchConfig(path.basename(this.profileComponent.fsPath), ruleCtor.name, config);
		};
		const initializeRules = (ruleCtors: ProfileComponentRuleConstructor[]) => {
			return ruleCtors.filter(filterRule).map(ruleCtor => {
				return new ruleCtor(this.profileComponent);
			});
		};
		const initializePslRules = (ruleCtors: PslRuleConstructor[]) => {
			return ruleCtors.filter(filterRule).map(ruleCtor => {
				const pslParsedDocument = this.parsedDocument as ParsedDocument;
				return new ruleCtor(this.profileComponent, pslParsedDocument);
			});
		};

		this.componentRules = initializeRules(componentRuleConstructors);
		this.fileDefinitionRules = initializeRules(fileDefinitionRuleConstructors);
		this.pslRules = initializePslRules(pslRuleConstructors);
		this.methodRules = initializePslRules(methodRuleConstructors);
		this.memberRules = initializePslRules(memberRuleConstructors);
		this.propertyRules = initializePslRules(propertyRuleConstructors);
		this.declarationRules = initializePslRules(declarationRuleConstructors);
		this.parameterRules = initializePslRules(parameterRuleConstructors);
	}

	reportRules(): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		const collectDiagnostics = (rules: ProfileComponentRule[], ...args: any[]) => {
			rules.forEach(rule => diagnostics.push(...rule.report(...args)));
		};

		collectDiagnostics(this.componentRules);

		if (ProfileComponent.isFileDefinition(this.profileComponent.fsPath)) {
			collectDiagnostics(this.fileDefinitionRules);
		}

		if (ProfileComponent.isPsl(this.profileComponent.fsPath)) {
			collectDiagnostics(this.pslRules);

			const parsedDocument = this.parsedDocument as ParsedDocument;

			for (const property of parsedDocument.properties) {
				collectDiagnostics(this.memberRules, property);
				collectDiagnostics(this.propertyRules, property);
			}

			for (const declaration of parsedDocument.declarations) {
				collectDiagnostics(this.memberRules, declaration);
				collectDiagnostics(this.declarationRules, declaration);
			}

			for (const method of parsedDocument.methods) {
				collectDiagnostics(this.memberRules, method);
				collectDiagnostics(this.methodRules, method);

				for (const parameter of method.parameters) {
					collectDiagnostics(this.memberRules, parameter);
					collectDiagnostics(this.parameterRules, parameter, method);
				}

				for (const declaration of method.declarations) {
					collectDiagnostics(this.memberRules, declaration);
					collectDiagnostics(this.declarationRules, declaration, method);
				}
			}

		}

		return diagnostics;
	}
}
