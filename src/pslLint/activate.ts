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
	MemberStartsWithV, PropertyIsDummy,
} from './elementsConventionChecker';
import { MethodDocumentation, MethodSeparator, TwoEmptyLines } from './methodDoc';
import { MultiLineDeclare } from './multiLineDeclare';
import { MethodParametersOnNewLine } from './parameters';
import { RuntimeStart } from './runtime';
import { TblColDocumentation } from './tblcolDoc';
import { TodoInfo } from './todos';

interface Constructor<T> {
	new (): T;
}

/**
 * Add new rules here to have them checked at the appropriate time.
 */
const componentRuleConstructors: Constructor<ProfileComponentRule>[] = [];
const fileDefinitionRuleConstructors: Constructor<FileDefinitionRule>[] = [
	TblColDocumentation,
];
const pslRuleConstructors: Constructor<PslRule>[] = [
	TodoInfo,
];
const memberRuleConstructors: Constructor<MemberRule>[] = [
	MemberCamelCase,
	MemberLength,
	MemberStartsWithV,
	MemberLiteralCase,
];
const methodRuleConstructors: Constructor<MethodRule>[] = [
	MethodDocumentation,
	MethodSeparator,
	MethodParametersOnNewLine,
	RuntimeStart,
	MultiLineDeclare,
	TwoEmptyLines,
];
const propertyRuleConstructors: Constructor<PropertyRule>[] = [
	PropertyIsDummy,
];
const declarationRuleConstructors: Constructor<DeclarationRule>[] = [];
const parameterRuleConstructors: Constructor<ParameterRule>[] = [];

export function getDiagnostics(
	profileComponent: ProfileComponent,
	parsedDocument?: ParsedDocument,
	useConfig?: boolean,
): Diagnostic[] {
	const subscription = new RuleSubscription(profileComponent, parsedDocument, useConfig);
	return subscription.reportRules();
}

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

		const initializeRules = (ruleCtors: Constructor<ProfileComponentRule>[]) => {
			return ruleCtors.map(ruleCtor => {
				const rule = new ruleCtor();
				rule.profileComponent = this.profileComponent;
				return rule;
			}).filter(rule => {
				if (!config) return true;
				return matchConfig(path.basename(this.profileComponent.fsPath), rule.ruleName, config);
			});
		};
		const initializePslRules = (ruleCtor: Constructor<PslRule>[]) => {
			const componentInitialized = initializeRules(ruleCtor) as PslRule[];
			const pslParsedDocument = this.parsedDocument as ParsedDocument;
			return componentInitialized.map(rule => {
				rule.parsedDocument = pslParsedDocument;
				return rule;
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
